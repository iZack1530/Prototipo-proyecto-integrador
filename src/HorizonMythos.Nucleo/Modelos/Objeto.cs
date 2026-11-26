using System.Collections.Generic;

namespace HorizonMythos.Nucleo.Modelos
{
    /// <summary>Objeto pasivo, ofensivo o consumible del catálogo.</summary>
    public sealed class Objeto
    {
        public string Id { get; set; }
        public string Nombre { get; set; }
        public string Grupo { get; set; }
        public IReadOnlyDictionary<string, double> Multiplicadores { get; set; } = new Dictionary<string, double>();
        public string TipoEfecto { get; set; }
        public double Potencia { get; set; }
        public int CantidadInicial { get; set; }
    }
}
