using HorizonMythos.Nucleo.Datos;
using HorizonMythos.Nucleo.Modelos;

namespace HorizonMythos.Servidor.Servicios;

/// <summary>Carga una sola vez el catálogo del Núcleo y lo comparte con toda la API.</summary>
public sealed class CatalogoServicio
{
    public CatalogoServicio(IConfiguration configuracion, IWebHostEnvironment entorno, ILogger<CatalogoServicio> registro)
    {
        string? ruta = configuracion["Catalogo:Ruta"];
        if (string.IsNullOrWhiteSpace(ruta))
            ruta = BuscarArchivo(entorno.ContentRootPath, AppContext.BaseDirectory)
                ?? throw new FileNotFoundException(
                    "No se encontró datos_prueba.json. Configura Catalogo:Ruta o copia el archivo junto al servidor.");

        Catalogo = CargadorCatalogo.CargarDatosPrueba(File.ReadAllText(ruta));
        Ruta = ruta;
        registro.LogInformation("Catálogo cargado desde {Ruta}: {Criaturas} criaturas, {Ataques} ataques.",
            ruta, Catalogo.Criaturas.Count, Catalogo.Ataques.Count);
    }

    public Catalogo Catalogo { get; }
    public string Ruta { get; }

    private static string? BuscarArchivo(string contenido, string binarios)
    {
        string[] candidatos =
        {
            Path.Combine(contenido, "datos_prueba.json"),
            Path.Combine(binarios, "datos_prueba.json"),
            Path.Combine(contenido, "..", "..", "datos_prueba.json"),
            Path.Combine(contenido, "..", "..", "..", "datos_prueba.json"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "datos_prueba.json")
        };
        foreach (string candidato in candidatos)
        {
            string completo = Path.GetFullPath(candidato);
            if (File.Exists(completo)) return completo;
        }
        return null;
    }
}
