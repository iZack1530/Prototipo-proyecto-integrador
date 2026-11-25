using HorizonMythos.Nucleo.Combate;
using HorizonMythos.Nucleo.Formatos;
using HorizonMythos.Nucleo.Repeticiones;

namespace HorizonMythos.Servidor.Servicios;

/// <summary>Acción tal como la envía el cliente; acepta el contrato y los códigos cortos.</summary>
public sealed class AccionSolicitud
{
    public string? Tipo { get; set; }
    public string? MovimientoId { get; set; }
    public string? Objetivo { get; set; }
    public string? Objeto { get; set; }
    public string? IndiceObjetivo { get; set; }
    public string? CambioIndice { get; set; }
    public string? Pivote { get; set; }

    public Accion Convertir()
    {
        string tipo = (Tipo ?? "").Trim().ToLowerInvariant();
        switch (tipo)
        {
            case "atk":
            case "atacar":
                return Accion.Atacar(MovimientoId, Objetivo);
            case "sw":
            case "cambiar":
                return Accion.Cambiar(int.TryParse(CambioIndice ?? IndiceObjetivo, out int indice) ? indice : 0);
            case "it":
            case "usarobjeto":
            case "usar-objeto":
                return Accion.UsarObjeto(Objeto, IndiceObjetivo);
            case "pr":
            case "guardar":
                return Accion.Guardar();
            case "rc":
            case "recuperar":
                return Accion.Recuperar();
            case "em":
            case "emergencia":
                return Accion.Emergencia(Objetivo);
            default:
                return Accion.Atacar(MovimientoId, Objetivo);
        }
    }
}

/// <summary>Jugador dentro de una sala.</summary>
public sealed class JugadorSala
{
    public string Nombre { get; set; } = "Jugador";
    public string ConexionId { get; set; } = "";
    public Guid? UsuarioId { get; set; }
    public int Lado { get; set; }
    public IReadOnlyList<string> Equipo { get; set; } = new List<string>();
}

/// <summary>Estado completo de una sala de combate en memoria.</summary>
public sealed class Sala
{
    public string Id { get; set; } = "";
    public string Semilla { get; set; } = "";
    public string FormatoId { get; set; } = "3v3";
    public Formato Formato { get; set; } = Formato.TresVsTres;
    public Batalla Batalla { get; set; } = null!;
    public JugadorSala JugadorA { get; set; } = new();
    public JugadorSala JugadorB { get; set; } = new();
    public Accion? AccionA { get; set; }
    public Accion? AccionB { get; set; }
    public bool Terminada { get; set; }
    public DateTimeOffset CreadaEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UltimaActividad { get; set; } = DateTimeOffset.UtcNow;
    public CancellationTokenSource? Temporizador { get; set; }

    public SemaphoreSlim Turno { get; } = new(1, 1);
    public object Candado { get; } = new();
    public Repeticion? Repeticion { get; set; }

    public object Resumen() => new
    {
        salaId = Id,
        formato = FormatoId,
        semilla = Semilla,
        turno = Batalla.NumeroTurno,
        terminada = Terminada,
        creadaEn = CreadaEn,
        jugadores = new[]
        {
            new { nombre = JugadorA.Nombre, lado = 0 },
            new { nombre = JugadorB.Nombre, lado = 1 }
        }
    };

    public object Estado() => new
    {
        salaId = Id,
        turno = Batalla.NumeroTurno,
        clima = Batalla.Clima,
        terminada = Terminada,
        estado = Batalla.ObtenerEstado()
    };
}
