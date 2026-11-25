using System.Text.Json;

namespace HorizonMythos.Nucleo.Pruebas;

/// <summary>
/// Carga única de los vectores generados por el Laboratorio. El orden de los grupos
/// (RNG, estadísticas, costes, daño, efectos y repeticiones) es parte del contrato.
/// </summary>
public static class VectorCasosPrueba
{
    public static readonly JsonDocument Documento = JsonDocument.Parse(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "casos_prueba.json")));

    public static JsonElement Grupo(string orden) =>
        Documento.RootElement.GetProperty("grupos").EnumerateArray()
            .Single(g => g.GetProperty("orden").GetString() == orden)
            .GetProperty("casos");

    public static IReadOnlyList<string> OrdenesEsperados { get; } = new[]
    {
        "rng", "estadisticas", "costes", "dano", "efectos", "repeticiones"
    };
}

public class VectorCasosPruebaTests
{
    [Fact]
    public void EsquemaYGruposSonLosEsperados()
    {
        Assert.Equal(1, VectorCasosPrueba.Documento.RootElement.GetProperty("esquema").GetInt32());
        Assert.Equal(5, VectorCasosPrueba.Documento.RootElement.GetProperty("origen").GetProperty("version").GetInt32());

        var ordenes = VectorCasosPrueba.Documento.RootElement.GetProperty("grupos")
            .EnumerateArray().Select(g => g.GetProperty("orden").GetString()).ToArray();
        Assert.Equal(VectorCasosPrueba.OrdenesEsperados, ordenes);
    }
}
