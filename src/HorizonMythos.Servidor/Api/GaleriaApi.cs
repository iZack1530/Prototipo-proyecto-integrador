using HorizonMythos.Servidor.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace HorizonMythos.Servidor.Api;

/// <summary>Listado público de la galería y subida de obras con autor autenticado.</summary>
public static class GaleriaApi
{
    private static readonly HashSet<string> Extensiones = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    public static void MapGaleria(this IEndpointRouteBuilder rutas)
    {
        rutas.MapGet("/api/galeria", async (ContextoBd bd, string? etiqueta, string? criatura) =>
        {
            IQueryable<ObraGaleria> consulta = bd.ObrasGaleria.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(etiqueta))
            {
                string patron = etiqueta.Trim().ToLowerInvariant();
                consulta = consulta.Where(o => o.Etiquetas.ToLower().Contains(patron));
            }
            if (!string.IsNullOrWhiteSpace(criatura))
                consulta = consulta.Where(o => o.CriaturaRelacionada == criatura);

            var obras = await consulta.OrderByDescending(o => o.CreadaEn)
                .Select(o => new
                {
                    id = o.Id,
                    titulo = o.Titulo,
                    artista = o.Artista,
                    fecha = o.Fecha,
                    descripcion = o.Descripcion,
                    etiquetas = o.Etiquetas,
                    criaturaRelacionada = o.CriaturaRelacionada,
                    url = o.Url,
                    autor = o.Autor == null ? null : o.Autor.NombreVisible,
                    creadaEn = o.CreadaEn
                })
                .ToListAsync();

            return Results.Ok(obras);
        });

        rutas.MapPost("/api/galeria", async (HttpContext contexto, ContextoBd bd,
            IWebHostEnvironment entorno, IConfiguration configuracion, IFormFile archivo,
            [Microsoft.AspNetCore.Mvc.FromForm] string titulo,
            [Microsoft.AspNetCore.Mvc.FromForm] string? artista,
            [Microsoft.AspNetCore.Mvc.FromForm] string? fecha,
            [Microsoft.AspNetCore.Mvc.FromForm] string? descripcion,
            [Microsoft.AspNetCore.Mvc.FromForm] string? etiquetas,
            [Microsoft.AspNetCore.Mvc.FromForm] string? criaturaRelacionada) =>
        {
            Guid? usuarioId = contexto.User.ObtenerUsuarioId();
            if (usuarioId == null) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(titulo))
                return Results.BadRequest(new { error = "El título es obligatorio." });
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "Falta el archivo de la obra." });
            if (archivo.Length > 15 * 1024 * 1024)
                return Results.BadRequest(new { error = "El archivo supera 15 MB." });

            string extension = Path.GetExtension(archivo.FileName);
            if (!Extensiones.Contains(extension))
                return Results.BadRequest(new { error = "Formato no permitido (jpg, png, webp o gif)." });

            string carpeta = configuracion["Galeria:Ruta"] ?? "";
            if (string.IsNullOrWhiteSpace(carpeta))
                carpeta = Path.Combine(entorno.WebRootPath ?? Path.Combine(entorno.ContentRootPath, "wwwroot"), "media");
            Directory.CreateDirectory(carpeta);
            string nombreArchivo = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            string destino = Path.Combine(carpeta, nombreArchivo);
            await using (FileStream flujo = File.Create(destino))
                await archivo.CopyToAsync(flujo);

            var obra = new ObraGaleria
            {
                Titulo = titulo.Trim(),
                Artista = string.IsNullOrWhiteSpace(artista) ? contexto.User.ObtenerNombreVisible() : artista.Trim(),
                Fecha = fecha ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                Descripcion = descripcion ?? "",
                Etiquetas = etiquetas ?? "",
                CriaturaRelacionada = criaturaRelacionada ?? "",
                Url = "/media/" + nombreArchivo,
                AutorId = usuarioId
            };
            bd.ObrasGaleria.Add(obra);
            await bd.SaveChangesAsync();

            return Results.Created($"/api/galeria/{obra.Id}", new
            {
                id = obra.Id,
                titulo = obra.Titulo,
                url = obra.Url,
                autor = obra.Artista
            });
        }).RequireAuthorization().DisableAntiforgery();
    }
}
