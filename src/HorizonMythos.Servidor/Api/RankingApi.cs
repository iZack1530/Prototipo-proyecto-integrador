using HorizonMythos.Servidor.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace HorizonMythos.Servidor.Api;

/// <summary>Clasificación pública por formato; se actualiza con Elo tras cada combate.</summary>
public static class RankingApi
{
    public static void MapRanking(this IEndpointRouteBuilder rutas)
    {
        rutas.MapGet("/api/ranking", async (ContextoBd bd, string? formato, int? limite) =>
        {
            string clave = string.IsNullOrWhiteSpace(formato) ? "3v3" : formato;
            int tope = Math.Clamp(limite ?? 50, 1, 200);

            var tabla = await bd.Clasificaciones.AsNoTracking()
                .Where(c => c.Formato == clave)
                .OrderByDescending(c => c.Puntos)
                .Take(tope)
                .Select(c => new
                {
                    usuarioId = c.UsuarioId,
                    nombre = c.Usuario == null ? "Jugador" : c.Usuario.NombreVisible,
                    puntos = c.Puntos,
                    partidas = c.Partidas,
                    victorias = c.Victorias,
                    derrotas = c.Derrotas,
                    actualizadoEn = c.ActualizadoEn
                })
                .ToListAsync();

            return Results.Ok(new { formato = clave, tabla });
        });
    }
}
