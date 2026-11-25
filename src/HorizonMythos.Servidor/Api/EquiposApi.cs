using System.Text.Json;
using HorizonMythos.Nucleo.Formatos;
using HorizonMythos.Servidor.Persistencia;
using HorizonMythos.Servidor.Servicios;
using Microsoft.EntityFrameworkCore;

namespace HorizonMythos.Servidor.Api;

public sealed record EquipoSolicitud(string Nombre, string Formato, IReadOnlyList<string> Criaturas);

/// <summary>Equipos del usuario autenticado, validados con ValidadorEquipo del Núcleo.</summary>
public static class EquiposApi
{
    public static void MapEquipos(this IEndpointRouteBuilder rutas)
    {
        var grupo = rutas.MapGroup("/api/equipos").RequireAuthorization();

        grupo.MapGet("/", async (HttpContext contexto, ContextoBd bd) =>
        {
            Guid? usuarioId = contexto.User.ObtenerUsuarioId();
            if (usuarioId == null) return Results.Unauthorized();

            var equipos = await bd.Equipos.Where(e => e.UsuarioId == usuarioId)
                .OrderByDescending(e => e.CreadoEn)
                .ToListAsync();

            return Results.Ok(equipos.Select(e => new
            {
                id = e.Id,
                nombre = e.Nombre,
                formato = e.Formato,
                criaturas = LeerCriaturas(e.CriaturasJson),
                creadoEn = e.CreadoEn
            }));
        });

        grupo.MapPost("/", async (EquipoSolicitud solicitud, HttpContext contexto, ContextoBd bd,
            CatalogoServicio catalogo) =>
        {
            Guid? usuarioId = contexto.User.ObtenerUsuarioId();
            if (usuarioId == null) return Results.Unauthorized();
            if (solicitud == null || string.IsNullOrWhiteSpace(solicitud.Nombre))
                return Results.BadRequest(new { error = "El nombre del equipo es obligatorio." });

            Formato formato = SalaCombateServicio.FormatoPorId(solicitud.Formato);
            IReadOnlyList<string> errores = ValidadorEquipo.Validar(catalogo.Catalogo,
                solicitud.Criaturas ?? new List<string>(), formato, solicitud.Nombre);
            if (errores.Count > 0)
                return Results.BadRequest(new { error = "Equipo no válido.", problemas = errores });

            var equipo = new Equipo
            {
                UsuarioId = usuarioId.Value,
                Nombre = solicitud.Nombre.Trim(),
                Formato = formato.Id,
                CriaturasJson = JsonSerializer.Serialize(solicitud.Criaturas)
            };
            bd.Equipos.Add(equipo);
            await bd.SaveChangesAsync();

            return Results.Created($"/api/equipos/{equipo.Id}", new
            {
                id = equipo.Id,
                nombre = equipo.Nombre,
                formato = equipo.Formato,
                criaturas = solicitud.Criaturas
            });
        });

        grupo.MapDelete("/{id:guid}", async (Guid id, HttpContext contexto, ContextoBd bd) =>
        {
            Guid? usuarioId = contexto.User.ObtenerUsuarioId();
            if (usuarioId == null) return Results.Unauthorized();
            Equipo? equipo = await bd.Equipos.FirstOrDefaultAsync(e => e.Id == id && e.UsuarioId == usuarioId);
            if (equipo == null) return Results.NotFound();
            bd.Equipos.Remove(equipo);
            await bd.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static List<string> LeerCriaturas(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch (JsonException)
        {
            return new List<string>();
        }
    }
}
