using System;
using System.Collections.Generic;
using HorizonMythos.Nucleo.Formulas;

namespace HorizonMythos.Nucleo.Modelos
{
    /// <summary>Criatura del catálogo: datos base, esfuerzo, fórmulas y movimientos.</summary>
    public sealed class Criatura
    {
        public string Id { get; set; }
        public string Nombre { get; set; }
        public string Especie { get; set; }
        public IReadOnlyList<string> Tipos { get; set; } = new List<string> { "Neutro" };
        public string HabilidadNombre { get; set; }
        public string HabilidadId { get; set; }
        public string DescripcionHabilidad { get; set; }
        public IReadOnlyList<string> Ataques { get; set; } = new List<string>();
        public IReadOnlyList<string> Aprendibles { get; set; } = new List<string>();
        public int Nivel { get; set; }
        public int Cap { get; set; }
        public IReadOnlyDictionary<string, double> Base { get; set; } = new Dictionary<string, double>();
        public IReadOnlyDictionary<string, double> Esfuerzo { get; set; } = new Dictionary<string, double>();
        public IReadOnlyDictionary<string, string> Formulas { get; set; } = new Dictionary<string, string>();
        public bool Sincronizada { get; set; }

        /// <summary>
        /// Calcula las estadísticas con las fórmulas de la criatura, aplicando duplicados
        /// de habilidad y el multiplicador de vida del objeto pasivo. Equivale a mk() en JS.
        /// </summary>
        public Estadisticas CalcularEstadisticas(Catalogo catalogo = null, string objetoPasivo = "")
        {
            var resultado = new Estadisticas();
            foreach (string clave in Reglas.ClavesEstadistica)
            {
                double baseValor, esfuerzoValor;
                string formula;
                if (!Base.TryGetValue(clave, out baseValor)) baseValor = 80;
                if (!Esfuerzo.TryGetValue(clave, out esfuerzoValor)) esfuerzoValor = 0;
                if (!Formulas.TryGetValue(clave, out formula) || string.IsNullOrEmpty(formula))
                    formula = Reglas.FormulaPorDefecto(clave);

                double valor = EvaluadorFormulas.Calcular(formula, baseValor, Nivel,
                    clave == "mp" ? 0 : esfuerzoValor);
                if (double.IsNaN(valor)) valor = 1;
                resultado.Asignar(clave, Math.Max(1, EvaluadorFormulas.RedondearJs(valor)));
            }

            Habilidad habilidad = catalogo == null ? null : catalogo.ObtenerHabilidad(this);
            if (habilidad != null)
            {
                foreach (Efecto efecto in habilidad.Efectos)
                {
                    if (efecto.Clave != "dbl") continue;
                    string stat = efecto.Texto("s").ToLowerInvariant();
                    if (Array.IndexOf(Reglas.ClavesEstadistica, stat) < 0) continue;
                    double multiplicador = efecto.Numero("m", 1);
                    double valor = Math.Max(1,
                        EvaluadorFormulas.RedondearJs(resultado.Obtener(stat) * multiplicador));
                    resultado.Asignar(stat, valor);
                }
            }

            double multiplicadorVida = 1;
            Dictionary<string, double> pasivo;
            if (!string.IsNullOrEmpty(objetoPasivo) &&
                Reglas.ObjetosPasivos.TryGetValue(objetoPasivo, out pasivo))
            {
                double multiplicador;
                if (pasivo.TryGetValue("hp", out multiplicador)) multiplicadorVida = multiplicador;
            }
            resultado.Hp = Math.Max(1, EvaluadorFormulas.RedondearJs(resultado.Hp * multiplicadorVida));
            return resultado;
        }
    }
}
