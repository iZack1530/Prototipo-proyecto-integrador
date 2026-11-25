using HorizonMythos.Nucleo.Formatos;
using HorizonMythos.Nucleo.Modelos;

namespace HorizonMythos.Servidor.Servicios;

public sealed record EntradaEmparejamiento(
    string Nombre, string ConexionId, Guid? UsuarioId, IReadOnlyList<string> Equipo);

public sealed class ResultadoEmparejamiento
{
    public required Sala Sala { get; init; }
    public required EntradaEmparejamiento Rival { get; init; }
}

/// <summary>Colas por formato. El primero que espera se empareja con el siguiente que entra.</summary>
public sealed class EmparejamientoServicio
{
    private readonly object _candado = new();
    private readonly Dictionary<string, List<EntradaEmparejamiento>> _colas = new();
    private readonly SalaCombateServicio _salas;
    private readonly CatalogoServicio _catalogos;
    private readonly ILogger<EmparejamientoServicio> _registro;

    public EmparejamientoServicio(SalaCombateServicio salas, CatalogoServicio catalogos,
        ILogger<EmparejamientoServicio> registro)
    {
        _salas = salas;
        _catalogos = catalogos;
        _registro = registro;
    }

    public ResultadoEmparejamiento? Unirse(string formatoId, EntradaEmparejamiento entrada)
    {
        string clave = ClaveFormato(formatoId);
        Formato formato = SalaCombateServicio.FormatoPorId(clave);
        IReadOnlyList<string> equipo = NormalizarEquipo(entrada.Equipo, formato);
        var solicitante = entrada with { Equipo = equipo };

        lock (_candado)
        {
            foreach (List<EntradaEmparejamiento> cola in _colas.Values)
                cola.RemoveAll(e => e.ConexionId == solicitante.ConexionId);

            if (!_colas.TryGetValue(clave, out List<EntradaEmparejamiento>? espera))
            {
                espera = new List<EntradaEmparejamiento>();
                _colas[clave] = espera;
            }

            EntradaEmparejamiento? rival = espera.FirstOrDefault();
            if (rival == null)
            {
                espera.Add(solicitante);
                _registro.LogInformation("{Jugador} espera en la cola {Formato}.", solicitante.Nombre, clave);
                return null;
            }

            espera.Remove(rival);
            Sala sala = _salas.Crear(clave,
                new JugadorSala
                {
                    Nombre = rival.Nombre,
                    ConexionId = rival.ConexionId,
                    UsuarioId = rival.UsuarioId,
                    Lado = 0,
                    Equipo = rival.Equipo
                },
                new JugadorSala
                {
                    Nombre = solicitante.Nombre,
                    ConexionId = solicitante.ConexionId,
                    UsuarioId = solicitante.UsuarioId,
                    Lado = 1,
                    Equipo = solicitante.Equipo
                });

            _registro.LogInformation("Sala {Sala}: {A} contra {B}.", sala.Id, rival.Nombre, solicitante.Nombre);
            return new ResultadoEmparejamiento { Sala = sala, Rival = rival };
        }
    }

    public void Salir(string conexionId)
    {
        lock (_candado)
        {
            foreach (List<EntradaEmparejamiento> cola in _colas.Values)
                cola.RemoveAll(e => e.ConexionId == conexionId);
        }
    }

    public IReadOnlyList<string> NormalizarEquipo(IReadOnlyList<string>? propuesto, Formato formato)
    {
        if (propuesto != null && propuesto.Count > 0 &&
            ValidadorEquipo.Validar(_catalogos.Catalogo, propuesto, formato).Count == 0)
            return propuesto;

        int tamano = formato == Formato.Laboratorio ? 3 : Math.Max(1, formato.TamanoEquipo);
        Catalogo catalogo = _catalogos.Catalogo;
        var equipo = new List<string>();
        var especies = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (Criatura criatura in catalogo.Criaturas)
        {
            if (equipo.Count >= tamano) break;
            if (criatura.Nivel > formato.NivelMaximo) continue;
            if (formato.TieneClausula("sin-repetir-especie") && !especies.Add(criatura.Especie)) continue;
            if (formato.Prohibidos.Contains(criatura.Id)) continue;
            equipo.Add(criatura.Id);
        }

        foreach (Criatura criatura in catalogo.Criaturas)
        {
            if (equipo.Count >= tamano) break;
            if (!equipo.Contains(criatura.Id)) equipo.Add(criatura.Id);
        }

        return equipo;
    }

    private static string ClaveFormato(string? formatoId) => formatoId switch
    {
        "5v5-elige-3" or "5v5" => "5v5-elige-3",
        "laboratorio" => "laboratorio",
        _ => "3v3"
    };
}
