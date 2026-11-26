using System.Text.Json;
using HorizonMythos.Nucleo.Formatos;
using HorizonMythos.Nucleo.Repeticiones;

namespace HorizonMythos.Nucleo.Pruebas;

public class FormatosYRepeticionesTests
{
    [Fact]
    public void ElValidadorAceptaEquiposDelLaboratorioYRechazaErrores()
    {
        Assert.Empty(ValidadorEquipo.Validar(VectorDatos.Catalogo,
            new[] { "c_tonatiuh", "c_quetzal" }, Formato.Laboratorio));
        Assert.Empty(ValidadorEquipo.Validar(VectorDatos.Catalogo,
            new[] { "c_tonatiuh", "c_quetzal", "c_ahuizotl" }, Formato.TresVsTres));

        var errores = ValidadorEquipo.Validar(VectorDatos.Catalogo,
            new[] { "c_no_existe" }, Formato.TresVsTres);
        Assert.Contains(errores, e => e.Contains("se necesitan 3"));
        Assert.Contains(errores, e => e.Contains("desconocida"));

        Assert.Contains(ValidadorEquipo.Validar(VectorDatos.Catalogo,
            new[] { "c_tonatiuh", "c_tonatiuh" }, Formato.TresVsTres),
            e => e.Contains("se necesitan 3") || e.Contains("repetida"));
    }

    [Fact]
    public void LaRepeticionDelVectorEsDeterministaYCoincideConElLaboratorio()
    {
        JsonElement caso = VectorCasosPrueba.Grupo("repeticiones")[0];
        Repeticion repeticion = GestorRepeticiones.Leer(caso.GetRawText());
        var gestor = new GestorRepeticiones(VectorDatos.Catalogo);

        ResultadoRepeticion resultado = gestor.Ejecutar(repeticion);
        ResultadoRepeticion repetido = gestor.Ejecutar(repeticion);

        Assert.Equal(repeticion.Semilla, resultado.Semilla);
        Assert.Equal(resultado.Eventos, repetido.Eventos);

        var esperados = caso.GetProperty("turnos").EnumerateArray().ToArray();
        Assert.Equal(3, esperados.Length);
        Assert.DoesNotContain(resultado.Eventos, e => ((string)e).Contains("NaN"));
        Assert.NotEmpty(resultado.Eventos);
    }
}
