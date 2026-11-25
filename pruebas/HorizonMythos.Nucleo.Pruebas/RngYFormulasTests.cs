using System.Text.Json;
using HorizonMythos.Nucleo.Aleatorio;
using HorizonMythos.Nucleo.Formulas;

namespace HorizonMythos.Nucleo.Pruebas;

public class RngYFormulasTests
{
    [Fact]
    public void SemillaParidadCoincideConElVectorDelLaboratorio()
    {
        var caso = VectorCasosPrueba.Grupo("rng")[0];
        string semilla = caso.GetProperty("semilla").GetString()!;
        int decimales = caso.GetProperty("decimales").GetInt32();
        var esperados = caso.GetProperty("valores").EnumerateArray()
            .Select(v => v.GetDouble()).ToArray();

        var rng = new Rng(semilla);
        var obtenidos = esperados.Select(_ => Math.Round(rng.Siguiente(), decimales, MidpointRounding.AwayFromZero)).ToArray();

        Assert.Equal(new[] { 0.4870110827, 0.0979723502, 0.4474085863 }, obtenidos);
        Assert.Equal(esperados, obtenidos);
    }

    [Fact]
    public void MismaSemillaDaMismaSecuenciaYSemillasDistintasNo()
    {
        var a = new Rng("paridad");
        var b = new Rng("paridad");
        var c = new Rng("otra-semilla");

        var secuenciaA = Enumerable.Range(0, 32).Select(_ => a.Siguiente()).ToArray();
        var secuenciaB = Enumerable.Range(0, 32).Select(_ => b.Siguiente()).ToArray();
        var secuenciaC = Enumerable.Range(0, 32).Select(_ => c.Siguiente()).ToArray();

        Assert.Equal(secuenciaA, secuenciaB);
        Assert.NotEqual(secuenciaA, secuenciaC);
        Assert.All(secuenciaA, v => Assert.InRange(v, 0.0, 1.0));
    }

    [Theory]
    [InlineData("B + N * 2 + 50", 70, 50, 0, 220d)]
    [InlineData("((310 * B^0.5) + ((E / 8) * 25) * N / 100) + 100 + (N * 2)", 80, 50, 0, 2972.7242920997d)]
    [InlineData("[((B * 2 / 5) + (E / 16)) / 2] * N + 50 + N", 80, 50, 0, 900d)]
    [InlineData("floor(sqrt(B)) + ceil(E/3) + abs(-2) + min(N, 40) + max(0, 7)", 81, 50, 6, 60d)]
    [InlineData("2**3 + -2^2", 0, 0, 0, 4d)]
    public void EvaluaFormulasConLaMismaPrecedenciaQueElJs(string formula, double b, double n, double e, double esperado)
    {
        Assert.Equal(esperado, EvaluadorFormulas.Calcular(formula, b, n, e), 8);
    }

    [Fact]
    public void FormulaInvalidaONoFinitaDaNaN()
    {
        Assert.True(double.IsNaN(EvaluadorFormulas.Calcular("B + desconocida", 1, 1, 1)));
        Assert.True(double.IsNaN(EvaluadorFormulas.Calcular("B / 0", 1, 1, 1)));
        Assert.True(double.IsNaN(EvaluadorFormulas.Calcular("", 1, 1, 1)));
    }

    [Fact]
    public void RedondeoEsElDeMathRoundDeJavaScript()
    {
        Assert.Equal(3d, EvaluadorFormulas.RedondearJs(2.5));
        Assert.Equal(-1d, EvaluadorFormulas.RedondearJs(-1.2));
        Assert.Equal(0d, EvaluadorFormulas.RedondearJs(-0.5));
    }
}
