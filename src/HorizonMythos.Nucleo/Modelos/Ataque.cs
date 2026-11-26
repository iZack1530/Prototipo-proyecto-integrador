using System.Collections.Generic;

namespace HorizonMythos.Nucleo.Modelos
{
    /// <summary>Movimiento ofensivo o de estado de una criatura.</summary>
    public sealed class Ataque
    {
        public string Id { get; set; }
        public string Nombre { get; set; }
        public string Descripcion { get; set; }
        public string Tipo { get; set; }
        public int Mp { get; set; }
        public string Categoria { get; set; }
        public double Potencia { get; set; }
        public string Alcance { get; set; }
        public double Aoe { get; set; }
        public IReadOnlyList<double> Rebotes { get; set; } = new List<double>();
        public int Prioridad { get; set; }
        public string Critico { get; set; }
        public double ProbabilidadCritico { get; set; }
        public bool Contacto { get; set; }
        public IReadOnlyList<Efecto> Efectos { get; set; } = new List<Efecto>();
    }
}
