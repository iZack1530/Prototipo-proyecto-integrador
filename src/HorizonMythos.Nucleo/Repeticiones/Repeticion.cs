using System.Collections.Generic;

namespace HorizonMythos.Nucleo.Repeticiones
{
    /// <summary>Descripción de una repetición: semilla, equipos y acciones por turno.</summary>
    public sealed class Repeticion
    {
        public string Id { get; set; }
        public string Semilla { get; set; }
        public string Formato { get; set; } = "laboratorio";
        public IReadOnlyList<string> EquipoA { get; set; } = new List<string>();
        public IReadOnlyList<string> EquipoB { get; set; } = new List<string>();
        public IReadOnlyList<IReadOnlyList<object>> Acciones { get; set; } = new List<IReadOnlyList<object>>();
    }

    /// <summary>Resultado de una repetición: semilla, equipos, acciones y eventos del Núcleo.</summary>
    public sealed class ResultadoRepeticion
    {
        public string Id { get; set; }
        public string Semilla { get; set; }
        public IReadOnlyList<string> EquipoA { get; set; }
        public IReadOnlyList<string> EquipoB { get; set; }
        public IReadOnlyList<object> Acciones { get; set; }
        public IReadOnlyList<object> Eventos { get; set; }
        public object Estado { get; set; }
    }
}
