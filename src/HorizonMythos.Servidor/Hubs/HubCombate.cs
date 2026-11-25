using HorizonMythos.Nucleo.Formatos;
using HorizonMythos.Servidor.Api;
using HorizonMythos.Servidor.Servicios;
using Microsoft.AspNetCore.SignalR;

namespace HorizonMythos.Servidor.Hubs;

/// <summary>
/// Hub del combate en línea (/hub/combate). El cliente solo envía acciones; el servidor
/// resuelve los turnos con el Núcleo y emite eventos.
/// </summary>
public sealed class HubCombate : Hub
{
    private readonly EmparejamientoServicio _emparejamiento;
    private readonly SalaCombateServicio _salas;
    private readonly PresenciaServicio _presencia;
    private readonly ILogger<HubCombate> _registro;

    public HubCombate(EmparejamientoServicio emparejamiento, SalaCombateServicio salas,
        PresenciaServicio presencia, ILogger<HubCombate> registro)
    {
        _emparejamiento = emparejamiento;
        _salas = salas;
        _presencia = presencia;
        _registro = registro;
    }

    public override async Task OnConnectedAsync()
    {
        Guid? usuarioId = Context.User?.ObtenerUsuarioId();
        if (usuarioId != null)
            _presencia.Registrar(Context.User!.ObtenerNombreVisible(), Context.ConnectionId, usuarioId);

        await Clients.Caller.SendAsync("Conectado", new { conexionId = Context.ConnectionId });
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? excepcion)
    {
        _emparejamiento.Salir(Context.ConnectionId);
        _presencia.Quitar(Context.ConnectionId);
        await _salas.AbandonarAsync(Context.ConnectionId);
        await base.OnDisconnectedAsync(excepcion);
    }

    /// <summary>Eco de diagnóstico del commit 4.1; se conserva para comprobar el hub.</summary>
    public Task<string> Eco(string mensaje) => Task.FromResult("eco: " + mensaje);

    /// <summary>Permite que un cliente anónimo elija el nombre con el que lo desafían.</summary>
    public async Task<string> Identificarse(string nombre)
    {
        string visible = (nombre ?? "").Trim();
        if (visible.Length < 3)
        {
            await Clients.Caller.SendAsync("ErrorNombre", new { error = "El nombre debe tener al menos 3 caracteres." });
            return "";
        }

        _presencia.Registrar(visible, Context.ConnectionId, Context.User?.ObtenerUsuarioId());
        await Clients.Caller.SendAsync("Identificado", new { nombre = visible });
        return visible;
    }

    public async Task<string?> UnirseCola(string formato, List<string>? equipo, string? nombre = null)
    {
        Guid? usuarioId = Context.User?.ObtenerUsuarioId();
        string visible = NombreActual(nombre);
        _presencia.Registrar(visible, Context.ConnectionId, usuarioId);

        var entrada = new EntradaEmparejamiento(visible, Context.ConnectionId, usuarioId,
            equipo ?? new List<string>());

        ResultadoEmparejamiento? resultado = _emparejamiento.Unirse(formato, entrada);
        if (resultado == null)
        {
            await Clients.Caller.SendAsync("EnCola", new { formato });
            return null;
        }

        Sala sala = resultado.Sala;
        await Groups.AddToGroupAsync(Context.ConnectionId, sala.Id);
        await Groups.AddToGroupAsync(resultado.Rival.ConexionId, sala.Id);
        await _salas.AnunciarInicioAsync(sala);
        _registro.LogInformation("Sala {Sala} iniciada por {A} y {B}.",
            sala.Id, resultado.Rival.Nombre, entrada.Nombre);
        return sala.Id;
    }

    /// <summary>Desafío directo a un jugador conectado por su nombre.</summary>
    public async Task<string?> Desafiar(string nombreRival, string formato, List<string>? equipo,
        string? nombre = null)
    {
        Guid? usuarioId = Context.User?.ObtenerUsuarioId();
        string visible = NombreActual(nombre);
        _presencia.Registrar(visible, Context.ConnectionId, usuarioId);

        Presencia? rival = _presencia.Buscar(nombreRival);
        if (rival == null || rival.ConexionId == Context.ConnectionId)
        {
            await Clients.Caller.SendAsync("RivalNoDisponible", new { nombre = nombreRival });
            return null;
        }

        Formato formatoResuelto = SalaCombateServicio.FormatoPorId(formato);
        IReadOnlyList<string> miEquipo = _emparejamiento.NormalizarEquipo(equipo, formatoResuelto);
        IReadOnlyList<string> suEquipo = _emparejamiento.NormalizarEquipo(null, formatoResuelto);

        Sala sala = _salas.Crear(formatoResuelto.Id,
            new JugadorSala
            {
                Nombre = visible,
                ConexionId = Context.ConnectionId,
                UsuarioId = usuarioId,
                Lado = 0,
                Equipo = miEquipo
            },
            new JugadorSala
            {
                Nombre = rival.Nombre,
                ConexionId = rival.ConexionId,
                UsuarioId = rival.UsuarioId,
                Lado = 1,
                Equipo = suEquipo
            });

        await Groups.AddToGroupAsync(Context.ConnectionId, sala.Id);
        await Groups.AddToGroupAsync(rival.ConexionId, sala.Id);
        await Clients.Client(rival.ConexionId).SendAsync("Desafiado", new
        {
            salaId = sala.Id,
            retador = visible,
            formato = sala.FormatoId
        });
        await _salas.AnunciarInicioAsync(sala);
        _registro.LogInformation("Sala {Sala}: desafío de {A} a {B}.", sala.Id, visible, rival.Nombre);
        return sala.Id;
    }

    public async Task SalirCola()
    {
        _emparejamiento.Salir(Context.ConnectionId);
        await Clients.Caller.SendAsync("FueraDeCola");
    }

    public async Task EnviarAccion(string salaId, AccionSolicitud accion)
    {
        var (eventos, terminada, error) = await _salas.EnviarAccionAsync(salaId, Context.ConnectionId, accion);
        if (error != null)
            await Clients.Caller.SendAsync("ErrorAccion", new { salaId, error });
        else if (eventos.Count == 0 && !terminada)
            await Clients.Caller.SendAsync("AccionRegistrada", new { salaId });
    }

    public async Task<bool> ReconectarSala(string salaId, string? nombre = null)
    {
        string visible = NombreActual(nombre);
        _presencia.Registrar(visible, Context.ConnectionId, Context.User?.ObtenerUsuarioId());

        Sala? sala = await _salas.ReconectarAsync(salaId, visible, Context.ConnectionId,
            Context.User?.ObtenerUsuarioId());
        if (sala == null)
        {
            await Clients.Caller.SendAsync("ErrorReconexion", new { salaId, error = "Sala no encontrada." });
            return false;
        }
        await Groups.AddToGroupAsync(Context.ConnectionId, sala.Id);
        return true;
    }

    public async Task EstadoSala(string salaId)
    {
        Sala? sala = _salas.Obtener(salaId);
        if (sala == null)
            await Clients.Caller.SendAsync("ErrorAccion", new { salaId, error = "Sala no encontrada." });
        else
            await Clients.Caller.SendAsync("Estado", sala.Estado());
    }

    private string NombreActual(string? nombre)
    {
        Presencia? registrada = _presencia.BuscarPorConexion(Context.ConnectionId);
        bool autenticado = Context.User?.Identity?.IsAuthenticated == true;
        return (autenticado ? Context.User!.ObtenerNombreVisible() : null)
            ?? (string.IsNullOrWhiteSpace(nombre) ? null : nombre.Trim())
            ?? registrada?.Nombre
            ?? $"Jugador-{Context.ConnectionId[..Math.Min(6, Context.ConnectionId.Length)]}";
    }
}
