using System.Collections.Concurrent;
using System.Text.Json;
using HorizonMythos.Nucleo.Combate;
using HorizonMythos.Nucleo.Formatos;
using HorizonMythos.Servidor.Hubs;
using HorizonMythos.Servidor.Persistencia;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

namespace HorizonMythos.Servidor.Servicios;

/// <summary>
/// Salas de combate en memoria. El servidor es la única autoridad: valida las acciones,
/// llama a Batalla.ResolverTurno() del Núcleo y emite los eventos a los jugadores.
/// </summary>
public sealed class SalaCombateServicio
{
    private readonly ConcurrentDictionary<string, Sala> _salas = new();
    private readonly ConcurrentDictionary<string, (string SalaId, int Lado)> _porConexion = new();
    private readonly CatalogoServicio _catalogos;
    private readonly IServiceScopeFactory _ambito;
    private readonly IHubContext<HubCombate> _hub;
    private readonly ILogger<SalaCombateServicio> _registro;
    private readonly OpcionesCombate _opciones;
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public SalaCombateServicio(CatalogoServicio catalogos, IServiceScopeFactory ambito,
        IHubContext<HubCombate> hub, IOptions<OpcionesCombate> opciones, ILogger<SalaCombateServicio> registro)
    {
        _catalogos = catalogos;
        _ambito = ambito;
        _hub = hub;
        _opciones = opciones.Value;
        _registro = registro;
    }

    public static Formato FormatoPorId(string? id) => id switch
    {
        "5v5-elige-3" or "5v5" => Formato.CincoEligeTres,
        "laboratorio" => Formato.Laboratorio,
        _ => Formato.TresVsTres
    };

    public Sala Crear(string formatoId, JugadorSala jugadorA, JugadorSala jugadorB)
    {
        Formato formato = FormatoPorId(formatoId);
        var sala = new Sala
        {
            Id = Guid.NewGuid().ToString("N")[..16],
            Semilla = Guid.NewGuid().ToString("N"),
            FormatoId = formato.Id,
            Formato = formato,
            JugadorA = jugadorA,
            JugadorB = jugadorB
        };
        sala.Batalla = Batalla.Crear(_catalogos.Catalogo, jugadorA.Equipo, jugadorB.Equipo,
            formato, sala.Semilla);
        _salas[sala.Id] = sala;
        RegistrarConexion(jugadorA.ConexionId, sala.Id, 0);
        RegistrarConexion(jugadorB.ConexionId, sala.Id, 1);
        _registro.LogInformation("Sala {Sala} creada en {Formato}.", sala.Id, formato.Id);
        return sala;
    }

    public Sala? Obtener(string salaId) =>
        _salas.TryGetValue(salaId, out Sala? sala) ? sala : null;

    public async Task AnunciarInicioAsync(Sala sala)
    {
        var carga = new
        {
            salaId = sala.Id,
            formato = sala.FormatoId,
            semilla = sala.Semilla,
            jugadores = new[]
            {
                new { nombre = sala.JugadorA.Nombre, lado = 0 },
                new { nombre = sala.JugadorB.Nombre, lado = 1 }
            },
            estado = sala.Batalla.ObtenerEstado()
        };
        await _hub.Clients.Group(sala.Id).SendAsync("Emparejado", carga);
       PosponerTemporizador(sala);
    }

    public async Task<Sala?> ReconectarAsync(string salaId, string nombre, string conexionId, Guid? usuarioId)
    {
        Sala? sala = Obtener(salaId);
        if (sala == null) return null;

        await sala.Turno.WaitAsync();
        try
        {
            JugadorSala? jugador = ElegirJugador(sala, nombre, usuarioId);
            if (jugador == null) return null;

            if (!string.IsNullOrWhiteSpace(jugador.ConexionId))
                _porConexion.TryRemove(jugador.ConexionId, out _);
            jugador.ConexionId = conexionId;
            RegistrarConexion(conexionId, sala.Id, jugador.Lado);
            sala.UltimaActividad = DateTimeOffset.UtcNow;
        }
        finally
        {
            sala.Turno.Release();
        }

        await _hub.Groups.AddToGroupAsync(conexionId, sala.Id);
        await _hub.Clients.Client(conexionId).SendAsync("Reconectado", sala.Resumen());
        await _hub.Clients.Client(conexionId).SendAsync("Estado", sala.Estado());
        return sala;
    }

    public async Task<(IReadOnlyList<EventoCombate> Eventos, bool Terminada, string? Error)>
        EnviarAccionAsync(string salaId, string conexionId, AccionSolicitud solicitud)
    {
        Sala? sala = Obtener(salaId);
        if (sala == null) return (Array.Empty<EventoCombate>(), false, "La sala no existe.");
        if (solicitud == null) return (Array.Empty<EventoCombate>(), false, "Acción vacía.");

        Accion accion;
        try
        {
            accion = solicitud.Convertir();
        }
        catch (Exception)
        {
            return (Array.Empty<EventoCombate>(), false, "Acción no válida.");
        }

        await sala.Turno.WaitAsync();
        try
        {
            if (sala.Terminada) return (Array.Empty<EventoCombate>(), true, "La sala ya terminó.");
            int lado = LadoDe(sala, conexionId);
            if (lado < 0) return (Array.Empty<EventoCombate>(), false, "No perteneces a esta sala.");
            if (lado == 0) sala.AccionA = accion;
            else sala.AccionB = accion;
            sala.UltimaActividad = DateTimeOffset.UtcNow;
            if (sala.AccionA == null || sala.AccionB == null)
            {
                await _hub.Clients.Group(sala.Id).SendAsync("EsperandoRival", new { salaId = sala.Id, lado });
                return (Array.Empty<EventoCombate>(), false, null);
            }
        }
        finally
        {
            sala.Turno.Release();
        }

        IReadOnlyList<EventoCombate> eventos = await ResolverTurnoAsync(sala, false);
        return (eventos, sala.Terminada, null);
    }

    public async Task AbandonarAsync(string conexionId)
    {
        if (!_porConexion.TryRemove(conexionId, out var ubicacion)) return;
        Sala? sala = Obtener(ubicacion.SalaId);
        if (sala == null) return;
        await _hub.Clients.Group(sala.Id).SendAsync("RivalDesconectado", new
        {
            salaId = sala.Id,
            lado = ubicacion.Lado
        });
    }

    public IEnumerable<object> Activas() =>
        _salas.Values.Where(s => !s.Terminada).Select(s => s.Resumen());

    private async Task<IReadOnlyList<EventoCombate>> ResolverTurnoAsync(Sala sala, bool porTiempo)
    {
        IReadOnlyList<EventoCombate> eventos;
        await sala.Turno.WaitAsync();
        try
        {
            if (sala.Terminada) return Array.Empty<EventoCombate>();
            Accion accionA = sala.AccionA ?? Accion.Guardar();
            Accion accionB = sala.AccionB ?? Accion.Guardar();
            sala.AccionA = null;
            sala.AccionB = null;
            eventos = sala.Batalla.ResolverTurno(accionA, accionB);
            sala.UltimaActividad = DateTimeOffset.UtcNow;

            if (sala.Batalla.NumeroTurno >= _opciones.TurnosMaximos)
            {
                sala.Terminada = true;
            }
            else
            {
                sala.Terminada = sala.Batalla.Terminado;
            }
        }
        finally
        {
            sala.Turno.Release();
        }

        if (eventos.Count > 0)
        {
            object[] mensajes = eventos.Select(e => new
            {
                mensaje = e.Mensaje,
                categoria = e.Categoria,
                lado = e.Lado,
                indice = e.Indice
            }).ToArray();
            await _hub.Clients.Group(sala.Id).SendAsync("Evento", new { salaId = sala.Id, eventos = mensajes });
        }

        await _hub.Clients.Group(sala.Id).SendAsync("Estado", sala.Estado());

        if (sala.Terminada)
        {
            await TerminarAsync(sala, porTiempo);
        }
        else
        {
            PosponerTemporizador(sala);
        }
        return eventos;
    }

    private async Task TerminarAsync(Sala sala, bool porTiempo)
    {
        sala.Temporizador?.Cancel();
        int? ganador = CalcularGanador(sala);
        string? nombreGanador = ganador switch
        {
            0 => sala.JugadorA.Nombre,
            1 => sala.JugadorB.Nombre,
            _ => null
        };

        await _hub.Clients.Group(sala.Id).SendAsync("Fin", new
        {
            salaId = sala.Id,
            ganador,
            nombreGanador,
            porTiempo,
            estado = sala.Batalla.ObtenerEstado()
        });

        Guid? idGanador = ganador == 0 ? sala.JugadorA.UsuarioId : ganador == 1 ? sala.JugadorB.UsuarioId : null;
        Guid? idPerdedor = ganador == 0 ? sala.JugadorB.UsuarioId : ganador == 1 ? sala.JugadorA.UsuarioId : null;

        try
        {
            using IServiceScope ambito = _ambito.CreateScope();
            var bd = ambito.ServiceProvider.GetRequiredService<ContextoBd>();
            var repeticion = new Repeticion
            {
                Id = sala.Id,
                Semilla = sala.Semilla,
                Formato = sala.FormatoId,
                EquipoAJson = JsonSerializer.Serialize(sala.JugadorA.Equipo, _json),
                EquipoBJson = JsonSerializer.Serialize(sala.JugadorB.Equipo, _json),
                AccionesJson = JsonSerializer.Serialize(sala.Batalla.AccionesGrabadas, _json),
                EventosJson = JsonSerializer.Serialize(sala.Batalla.Historial.Select(e => e.Mensaje), _json),
                Ganador = nombreGanador
            };
            bd.Repeticiones.Add(repeticion);
            await bd.SaveChangesAsync();

            if (idGanador != null && idPerdedor != null)
            {
                var clasificacion = ambito.ServiceProvider.GetRequiredService<ClasificacionServicio>();
                await clasificacion.RegistrarAsync(idGanador, idPerdedor, sala.FormatoId);
            }
        }
        catch (Exception ex)
        {
            _registro.LogError(ex, "No se pudo guardar la repetición de la sala {Sala}.", sala.Id);
        }
        finally
        {
            _salas.TryRemove(sala.Id, out _);
            _porConexion.TryRemove(sala.JugadorA.ConexionId, out _);
            _porConexion.TryRemove(sala.JugadorB.ConexionId, out _);
        }
    }

    private void PosponerTemporizador(Sala sala)
    {
        sala.Temporizador?.Cancel();
        var cts = new CancellationTokenSource();
        sala.Temporizador = cts;
        TimeSpan espera = TimeSpan.FromSeconds(Math.Max(3, _opciones.SegundosTurno));
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(espera, cts.Token);
            }
            catch (OperationCanceledException)
            {
                return;
            }
            if (sala.Terminada) return;
            _ = ResolverTurnoAsync(sala, true);
        }, CancellationToken.None);
    }

    private static int? CalcularGanador(Sala sala)
    {
        EstadoCombate estado = sala.Batalla.ObtenerEstado();
        bool vivosA = estado.U[0].Any(u => !u.Ko);
        bool vivosB = estado.U[1].Any(u => !u.Ko);
        if (vivosA && !vivosB) return 0;
        if (vivosB && !vivosA) return 1;
        return null;
    }

    private static JugadorSala? ElegirJugador(Sala sala, string nombre, Guid? usuarioId)
    {
        if (usuarioId != null)
        {
            if (sala.JugadorA.UsuarioId == usuarioId) return sala.JugadorA;
            if (sala.JugadorB.UsuarioId == usuarioId) return sala.JugadorB;
        }
        if (!string.IsNullOrWhiteSpace(nombre))
        {
            if (string.Equals(sala.JugadorA.Nombre, nombre, StringComparison.OrdinalIgnoreCase)) return sala.JugadorA;
            if (string.Equals(sala.JugadorB.Nombre, nombre, StringComparison.OrdinalIgnoreCase)) return sala.JugadorB;
        }
        return null;
    }

    private static int LadoDe(Sala sala, string conexionId)
    {
        if (sala.JugadorA.ConexionId == conexionId) return 0;
        if (sala.JugadorB.ConexionId == conexionId) return 1;
        return -1;
    }

    private void RegistrarConexion(string conexionId, string salaId, int lado)
    {
        if (!string.IsNullOrWhiteSpace(conexionId))
            _porConexion[conexionId] = (salaId, lado);
    }
}
