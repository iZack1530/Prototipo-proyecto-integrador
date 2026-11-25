namespace HorizonMythos.Servidor.Persistencia;

/// <summary>Cuenta de jugador. La contraseña solo se guarda como hash derivado.</summary>
public sealed class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string NombreVisible { get; set; } = "";
    public string Correo { get; set; } = "";
    public string HashContrasena { get; set; } = "";
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public string? TokenRecuperacion { get; set; }
    public DateTimeOffset? TokenRecuperacionExpira { get; set; }

    public ICollection<Equipo> Equipos { get; set; } = new List<Equipo>();
    public ICollection<ObraGaleria> Obras { get; set; } = new List<ObraGaleria>();
    public ICollection<Clasificacion> Clasificaciones { get; set; } = new List<Clasificacion>();
}

/// <summary>Equipo guardado por un jugador. Las criaturas se serializan como JSON.</summary>
public sealed class Equipo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
    public string Nombre { get; set; } = "";
    public string Formato { get; set; } = "3v3";
    public string CriaturasJson { get; set; } = "[]";
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Repetición determinista de un combate terminado.</summary>
public sealed class Repeticion
{
    public string Id { get; set; } = "";
    public string Semilla { get; set; } = "";
    public string Formato { get; set; } = "3v3";
    public string EquipoAJson { get; set; } = "[]";
    public string EquipoBJson { get; set; } = "[]";
    public string AccionesJson { get; set; } = "[]";
    public string EventosJson { get; set; } = "[]";
    public string? Ganador { get; set; }
    public DateTimeOffset CreadaEn { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Ficha de una obra de la galería con su autor.</summary>
public sealed class ObraGaleria
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Titulo { get; set; } = "";
    public string Artista { get; set; } = "";
    public string Fecha { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string Etiquetas { get; set; } = "";
    public string CriaturaRelacionada { get; set; } = "";
    public string Url { get; set; } = "";
    public Guid? AutorId { get; set; }
    public Usuario? Autor { get; set; }
    public DateTimeOffset CreadaEn { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Puntuación de un jugador en un formato (Elo).</summary>
public sealed class Clasificacion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
    public string Formato { get; set; } = "3v3";
    public double Puntos { get; set; } = 1000;
    public int Partidas { get; set; }
    public int Victorias { get; set; }
    public int Derrotas { get; set; }
    public DateTimeOffset ActualizadoEn { get; set; } = DateTimeOffset.UtcNow;
}
