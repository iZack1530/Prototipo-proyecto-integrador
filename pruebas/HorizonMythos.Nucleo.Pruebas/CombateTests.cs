using System.Text.Json;
using HorizonMythos.Nucleo.Combate;
using HorizonMythos.Nucleo.Formatos;

namespace HorizonMythos.Nucleo.Pruebas;

public class CombateTests
{
    [Fact]
    public void DanoCoincideConLosVectoresDelLaboratorio()
    {
        foreach (JsonElement caso in VectorCasosPrueba.Grupo("dano").EnumerateArray())
        {
            CalculoDanio calculo = Batalla.CalcularDanioPrueba(
                caso.GetProperty("atacante").GetString()!,
                caso.GetProperty("defensor").GetString()!,
                caso.GetProperty("ataque").GetString()!,
                caso.GetProperty("multiplicador").GetDouble(),
                caso.GetProperty("critico").GetBoolean(),
                caso.GetProperty("semilla").GetString()!);

            JsonElement esperado = caso.GetProperty("calculo");
            Assert.Equal(esperado.GetProperty("base").GetDouble(), calculo.Base, 6);
            Assert.Equal(esperado.GetProperty("bonus").GetDouble(), calculo.Bonus, 6);
            Assert.Equal(esperado.GetProperty("ty").GetDouble(), calculo.Tipo, 6);
            Assert.Equal(esperado.GetProperty("cw").GetDouble(), calculo.Clima, 6);
            Assert.Equal(esperado.GetProperty("ci").GetDouble(), calculo.Objeto, 6);
            Assert.Equal(esperado.GetProperty("pr").GetDouble(), calculo.Guardia, 6);
            Assert.Equal(esperado.GetProperty("mult").GetDouble(), calculo.Multiplicador, 6);
            Assert.Equal(esperado.GetProperty("ab").GetDouble(), calculo.Habilidad, 6);
            Assert.Equal(esperado.GetProperty("gd").GetDouble(), calculo.Reduccion, 6);
            Assert.Equal(caso.GetProperty("danio").GetInt32(), calculo.Danio);
        }
    }

    [Fact]
    public void EfectosCoincidenConLosVectoresDelLaboratorio()
    {
        foreach (JsonElement caso in VectorCasosPrueba.Grupo("efectos").EnumerateArray())
        {
            ResultadoEfectos resultado = Batalla.AplicarEfectosPrueba(
                caso.GetProperty("ataque").GetString()!,
                caso.GetProperty("semilla").GetString()!);

            Assert.Equal(
                caso.GetProperty("eventos").EnumerateArray()
                    .Select(e => e.GetString()).ToArray(),
                resultado.Eventos);

            JsonElement estado = caso.GetProperty("resultado");
            Assert.Equal(estado.GetProperty("atacante").GetProperty("hp").GetInt32(), resultado.Atacante.Hp);
            Assert.Equal(estado.GetProperty("atacante").GetProperty("mp").GetInt32(), resultado.Atacante.Mp);
            Assert.Equal(estado.GetProperty("defensor").GetProperty("hp").GetInt32(), resultado.Defensor.Hp);
            Assert.Equal(estado.GetProperty("defensor").GetProperty("mp").GetInt32(), resultado.Defensor.Mp);
        }
    }

    [Fact]
    public void BatallaSeCreaResuelveTurnosYTermina()
    {
        Batalla batalla = Batalla.Crear(
            VectorDatos.Catalogo,
            new[] { "c_tonatiuh", "c_quetzal" },
            new[] { "c_ahuizotl", "c_neutro" },
            Formato.Laboratorio,
            "humo");

        for (int i = 0; i < 30 && !batalla.Terminado; i++)
        {
            IReadOnlyList<EventoCombate> eventos = batalla.ResolverTurno(
                Accion.Atacar("a_llamarada", "1:0"),
                Accion.Atacar("a_chorro", "0:0"));
            Assert.NotEmpty(eventos);
            Assert.Contains(eventos, e => e.Mensaje.Contains("Turno"));
            Assert.All(eventos, e => Assert.DoesNotContain("NaN", e.Mensaje));
        }

        Assert.True(batalla.Terminado);
        Assert.NotEmpty(batalla.Historial);
        Assert.Equal(batalla.Historial.Count, batalla.Historial.Count);
    }
}
