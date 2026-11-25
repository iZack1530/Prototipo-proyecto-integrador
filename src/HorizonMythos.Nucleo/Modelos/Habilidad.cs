using System.Collections.Generic;

namespace HorizonMythos.Nucleo.Modelos
{
    /// <summary>Habilidad pasiva o reactiva de una criatura.</summary>
    public sealed class Habilidad
    {
        public string Id { get; set; }
        public string Nombre { get; set; }
        public string Descripcion { get; set; }
        public IReadOnlyList<Efecto> Efectos { get; set; } = new List<Efecto>();
    }
}
