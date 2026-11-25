using HorizonMythos.Servidor.Servicios;

namespace HorizonMythos.Servidor.Api;

/// <summary>Lista de combates activos para espectadores.</summary>
public static class CombatesApi
{
    public static void MapCombates(this IEndpointRouteBuilder rutas)
    {
        rutas.MapGet("/api/combates/activos", (SalaCombateServicio salas) =>
            Results.Ok(salas.Activas()));
    }
}
