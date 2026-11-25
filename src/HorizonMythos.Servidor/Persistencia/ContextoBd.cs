using Microsoft.EntityFrameworkCore;

namespace HorizonMythos.Servidor.Persistencia;

/// <summary>Contexto de EF Core con PostgreSQL (Npgsql). Las claves y los índices son estables.</summary>
public sealed class ContextoBd : DbContext
{
    public ContextoBd(DbContextOptions<ContextoBd> opciones) : base(opciones) { }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Equipo> Equipos => Set<Equipo>();
    public DbSet<Repeticion> Repeticiones => Set<Repeticion>();
    public DbSet<ObraGaleria> ObrasGaleria => Set<ObraGaleria>();
    public DbSet<Clasificacion> Clasificaciones => Set<Clasificacion>();

    protected override void OnModelCreating(ModelBuilder modelo)
    {
        modelo.Entity<Usuario>(e =>
        {
            e.ToTable("usuarios");
            e.HasKey(x => x.Id);
            e.Property(x => x.NombreVisible).HasMaxLength(60).IsRequired();
            e.Property(x => x.Correo).HasMaxLength(320).IsRequired();
            e.Property(x => x.HashContrasena).HasMaxLength(400).IsRequired();
            e.HasIndex(x => x.Correo).IsUnique();
            e.HasIndex(x => x.NombreVisible).IsUnique();
        });

        modelo.Entity<Equipo>(e =>
        {
            e.ToTable("equipos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).HasMaxLength(80).IsRequired();
            e.Property(x => x.Formato).HasMaxLength(40).IsRequired();
            e.Property(x => x.CriaturasJson).HasColumnType("jsonb").IsRequired();
            e.HasOne(x => x.Usuario).WithMany(x => x.Equipos)
                .HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.UsuarioId);
        });

        modelo.Entity<Repeticion>(e =>
        {
            e.ToTable("repeticiones");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.Semilla).HasMaxLength(200).IsRequired();
            e.Property(x => x.Formato).HasMaxLength(40).IsRequired();
            e.Property(x => x.EquipoAJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.EquipoBJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.AccionesJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.EventosJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.Ganador).HasMaxLength(80);
            e.HasIndex(x => x.CreadaEn);
        });

        modelo.Entity<ObraGaleria>(e =>
        {
            e.ToTable("obras_galeria");
            e.HasKey(x => x.Id);
            e.Property(x => x.Titulo).HasMaxLength(200).IsRequired();
            e.Property(x => x.Artista).HasMaxLength(120).IsRequired();
            e.Property(x => x.Fecha).HasMaxLength(40);
            e.Property(x => x.Descripcion).HasMaxLength(2000);
            e.Property(x => x.Etiquetas).HasMaxLength(400);
            e.Property(x => x.CriaturaRelacionada).HasMaxLength(80);
            e.Property(x => x.Url).HasMaxLength(500).IsRequired();
            e.HasOne(x => x.Autor).WithMany(x => x.Obras)
                .HasForeignKey(x => x.AutorId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CreadaEn);
        });

        modelo.Entity<Clasificacion>(e =>
        {
            e.ToTable("clasificaciones");
            e.HasKey(x => x.Id);
            e.Property(x => x.Formato).HasMaxLength(40).IsRequired();
            e.Property(x => x.Puntos).HasDefaultValue(1000d);
            e.HasOne(x => x.Usuario).WithMany(x => x.Clasificaciones)
                .HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UsuarioId, x.Formato }).IsUnique();
        });
    }
}
