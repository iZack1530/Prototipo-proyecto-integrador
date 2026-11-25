using System.Collections.Generic;
using System.Linq;

namespace HorizonMythos.Nucleo.Formatos
{
    /// <summary>Formato de combate: tamaño de equipo, criaturas activas y restricciones.</summary>
    public sealed class Formato
    {
        public Formato(string id, string nombre, int tamanoEquipo, int activos, int nivelMaximo,
            IReadOnlyList<string> clausulas = null, IReadOnlyList<string> prohibidos = null,
            bool exigirTamano = true)
        {
            Id = id;
            Nombre = nombre;
            TamanoEquipo = tamanoEquipo;
            Activos = activos;
            NivelMaximo = nivelMaximo;
            Clausulas = clausulas ?? new List<string>();
            Prohibidos = prohibidos ?? new List<string>();
            ExigirTamano = exigirTamano;
        }

        public string Id { get; }
        public string Nombre { get; }
        public int TamanoEquipo { get; }
        public int Activos { get; }
        public int NivelMaximo { get; }
        public IReadOnlyList<string> Clausulas { get; }
        public IReadOnlyList<string> Prohibidos { get; }
        public bool ExigirTamano { get; }

        public bool TieneClausula(string clausula) => Clausulas.Contains(clausula);

        /// <summary>Configuración del Laboratorio: seis huecos y dos activos, sin límite de nivel.</summary>
        public static Formato Laboratorio { get; } = new Formato(
            "laboratorio", "Laboratorio", 6, 2, 100, null, null, false);

        public static Formato TresVsTres { get; } = new Formato(
            "3v3", "3v3", 3, 1, 50, new List<string> { "sin-repetir-especie" });

        public static Formato CincoEligeTres { get; } = new Formato(
            "5v5-elige-3", "5v5 elige 3", 5, 3, 50, new List<string> { "sin-repetir-especie" });
    }
}
