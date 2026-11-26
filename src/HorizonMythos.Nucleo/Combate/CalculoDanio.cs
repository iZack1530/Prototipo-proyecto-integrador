using System.Collections.Generic;

namespace HorizonMythos.Nucleo.Combate
{
    /// <summary>Desglose del cálculo de daño, expuesto para las pruebas de paridad.</summary>
    public sealed class CalculoDanio
    {
        public int Turno { get; set; }
        public string Atacante { get; set; }
        public string Defensor { get; set; }
        public string Movimiento { get; set; }
        public int Nivel { get; set; }
        public double Potencia { get; set; }
        public bool Fisico { get; set; }
        public double Ataque { get; set; }
        public double Defensa { get; set; }
        public bool Critico { get; set; }
        public bool Stab { get; set; }
        public double Bonus { get; set; }
        public double Tipo { get; set; }
        public double Clima { get; set; }
        public double Objeto { get; set; }
        public double Guardia { get; set; }
        public double Poder { get; set; }
        public double Habilidad { get; set; }
        public double Reduccion { get; set; }
        public double Multiplicador { get; set; }
        public double Base { get; set; }
        public int Danio { get; set; }
    }

    /// <summary>Resultado de aplicar los efectos de un ataque en una prueba aislada.</summary>
    public sealed class ResultadoEfectos
    {
        public IReadOnlyList<string> Eventos { get; set; }
        public UnidadEfectos Atacante { get; set; }
        public UnidadEfectos Defensor { get; set; }
    }

    public sealed class UnidadEfectos
    {
        public int Hp { get; set; }
        public int Mp { get; set; }
        public string Status { get; set; }
        public int Trap { get; set; }
        public Dictionary<string, int> Bo { get; set; }
        public IReadOnlyList<Guardia> Guards { get; set; }
    }
}
