using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HorizonMythos.Servidor.Persistencia;

/// <summary>Permite generar migraciones con `dotnet ef` sin una base en ejecución.</summary>
public sealed class ContextoBdFabrica : IDesignTimeDbContextFactory<ContextoBd>
{
    public ContextoBd CreateDbContext(string[] args)
    {
        string cadena = Environment.GetEnvironmentVariable("ConnectionStrings__Principal")
            ?? "Host=localhost;Database=horizon_mythos";
        var opciones = new DbContextOptionsBuilder<ContextoBd>().UseNpgsql(cadena).Options;
        return new ContextoBd(opciones);
    }
}
