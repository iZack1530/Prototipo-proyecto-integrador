using System.Text.Json;
using HorizonMythos.Nucleo.Datos;
using HorizonMythos.Nucleo.Modelos;

namespace HorizonMythos.Nucleo.Pruebas;

public static class VectorDatos
{
    public static readonly Catalogo Catalogo = CargadorCatalogo.CargarDatosPrueba(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "datos_prueba.json")));
}

public class ModelosYCargadorTests
{
    [Fact]
    public void CargaElCatalogoDePruebaV5()
    {
        var catalogo = VectorDatos.Catalogo;

        Assert.Equal(5, catalogo.Version);
        Assert.Equal(12, catalogo.Criaturas.Count);
        Assert.Equal(52, catalogo.Ataques.Count);
        Assert.Equal(10, catalogo.Habilidades.Count);
        Assert.Equal("Tonatiuh", catalogo.ObtenerCriatura("c_tonatiuh")!.Nombre);
        Assert.Equal(new[] { "Fuego", "Viento" }, catalogo.ObtenerCriatura("c_tonatiuh")!.Tipos);
        Assert.Equal(0.5, catalogo.Tabla.Multiplicador("Fuego", "Agua"));
        Assert.Equal(2, catalogo.Tabla.Multiplicador("Planta", "Agua"));
    }

    [Fact]
    public void EstadisticasCoincidenConLosVectoresDelLaboratorio()
    {
        foreach (JsonElement caso in VectorCasosPrueba.Grupo("estadisticas").EnumerateArray())
        {
            string id = caso.GetProperty("id").GetString()!;
            Criatura criatura = VectorDatos.Catalogo.ObtenerCriatura(id);
            Assert.NotNull(criatura);

            Estadisticas estadisticas = criatura.CalcularEstadisticas(VectorDatos.Catalogo);
            JsonElement esperado = caso.GetProperty("esperado");
            foreach (string clave in new[] { "hp", "mp", "atk", "def", "matk", "mdef", "spd" })
                Assert.Equal(esperado.GetProperty(clave).GetDouble(), estadisticas.Obtener(clave));
        }
    }

    [Fact]
    public void CostesConYSinStabCoincidenConLosVectores()
    {
        foreach (JsonElement caso in VectorCasosPrueba.Grupo("costes").EnumerateArray())
        {
            Ataque ataque = VectorDatos.Catalogo.ObtenerAtaque(caso.GetProperty("id").GetString()!);
            Criatura usuario = VectorDatos.Catalogo.ObtenerCriatura(caso.GetProperty("usuario").GetString()!);
            Assert.NotNull(ataque);
            Assert.NotNull(usuario);

            JsonElement esperado = caso.GetProperty("esperado");
            Assert.Equal(esperado.GetProperty("con").GetInt32(), Reglas.Coste(usuario.Tipos, ataque));
            Assert.Equal(esperado.GetProperty("sin").GetInt32(),
                Reglas.Coste(new[] { "Neutro" }, ataque));
        }
    }

    [Fact]
    public void CargaElPaqueteUnityV3()
    {
        const string paquete = """
        {
          "formato": "rpg-lab-datos",
          "schema": 5,
          "tipos": [{"id":"tipo.fuego","nombre":"Fuego"},{"id":"tipo.neutro","nombre":"Neutro"}],
          "tablaTipos": {"relaciones":[
            {"atacanteId":"tipo.fuego","defensorId":"tipo.neutro","mult":2}
          ]},
          "habilidades": [{"id":"h_prueba","nombre":"Brasa","fx":[]}],
          "ataques": [{"id":"a_prueba","nombre":"Chispa","tipoId":"tipo.fuego","mp":10,
                       "cat":"mag","pot":60,"critico":"medio","criticoProb":7.5,"fx":[]}],
          "criaturas": [{"id":"c_prueba","nombre":"Prueba","tipoIds":["tipo.fuego"],
                         "habilidadId":"h_prueba","ataqueIds":["a_prueba"],
                         "nivel":50,"esfuerzoMax":480,
                         "base":{"hp":80,"mp":70,"atk":80,"def":65,"matk":100,"mdef":70,"spd":95},
                         "esfuerzo":{},"formulas":{}}],
          "objetos": {"pasivos":[],"ofensivos":[],"consumibles":[]}
        }
        """;

        Catalogo catalogo = CargadorCatalogo.CargarPaqueteUnityV3(paquete);

        Assert.Equal(5, catalogo.Version);
        Assert.Single(catalogo.Criaturas);
        Assert.Equal(new[] { "Fuego" }, catalogo.Criaturas[0].Tipos);
        Assert.Equal("Fuego", catalogo.ObtenerAtaque("a_prueba")!.Tipo);
        Assert.Equal(7.5, catalogo.ObtenerAtaque("a_prueba")!.ProbabilidadCritico);
        Assert.Equal(2, catalogo.Tabla.Multiplicador("Fuego", "Neutro"));
        Assert.Equal(2973, catalogo.Criaturas[0].CalcularEstadisticas(catalogo).Hp);
    }

    [Fact]
    public void ElLectorJsonManejaEscapesYNumeros()
    {
        object valor = JsonLigero.Analizar("{\"texto\":\"Quetzal\\u00edn\\n\\\"hola\\\"\",\"n\":1.25e2}");
        Assert.Equal("Quetzalín\n\"hola\"", JsonLigero.Texto(JsonLigero.Obtener(valor, "texto")));
        Assert.Equal(125, JsonLigero.Numero(JsonLigero.Obtener(valor, "n")));
    }
}
