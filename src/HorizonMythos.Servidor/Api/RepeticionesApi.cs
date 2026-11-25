using System.Text.Json;
using HorizonMythos.Servidor.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace HorizonMythos.Servidor.Api;

/// <summary>Consulta de repeticiones guardadas: semilla, equipos, acciones y eventos.</summary>
public static class RepeticionesApi
{
    public static void MapRepeticiones(this IEndpointRouteBuilder rutas)
    {
        rutas.MapGet("/api/repeticiones/{id}", async (string id, ContextoBd bd) =>
        {
            Repeticion? repeticion = await bd.Repeticiones.FirstOrDefaultAsync(r => r.Id == id);
            if (repeticion == null) return Results.NotFound(new { error = "Repetición no encontrada." });

            return Results.Ok(new
            {
                id = repeticion.Id,
                semilla = repeticion.Semilla,
                formato = repeticion.Formato,
                equipos = new[]
                {
                    Leer(repeticion.EquipoAJson),
                    Leer(repeticion.EquipoBJson)
                },
                acciones = Leer(repeticion.AccionesJson),
                eventos = Leer(repeticion.EventosJson),
                ganador = repeticion.Ganador,
                creadaEn = repeticion.CreadaEn
            });
        });

        rutas.MapGet("/api/repeticiones", async (ContextoBd bd, int? limite) =>
        {
            int tope = Math.Clamp(limite ?? 20, 1, 100);
            var lista = await bd.Repeticiones.OrderByDescending(r => r.CreadaEn)
                .Take(tope)
                .Select(r => new
                {
                    id = r.Id,
                    formato = r.Formato,
                    ganador = r.Ganador,
                    creadaEn = r.CreadaEn
                })
                .ToListAsync();
            return Results.Ok(lista);
        });
    }

    private static object? Leer(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<object>(json);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
