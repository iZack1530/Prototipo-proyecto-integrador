using HorizonMythos.Servidor.Servicios;

namespace HorizonMythos.Servidor.Api;

/// <summary>Catálogo público (criaturas, ataques, habilidades, tipos y objetos).</summary>
public static class CatalogoApi
{
    public static void MapCatalogo(this IEndpointRouteBuilder rutas)
    {
        rutas.MapGet("/api/catalogo", (CatalogoServicio servicio) =>
        {
            var catalogo = servicio.Catalogo;
            return Results.Ok(new
            {
                version = catalogo.Version,
                tipos = catalogo.Tipos,
                criaturas = catalogo.Criaturas,
                ataques = catalogo.Ataques,
                habilidades = catalogo.Habilidades,
                objetos = catalogo.Objetos
            });
        });
    }
}
