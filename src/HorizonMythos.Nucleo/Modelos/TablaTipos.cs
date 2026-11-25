using System.Collections.Generic;

namespace HorizonMythos.Nucleo.Modelos
{
    /// <summary>Tabla de efectividad por tipo. Las relaciones ausentes valen ×1.</summary>
    public sealed class TablaTipos
    {
        private readonly Dictionary<string, double> _relaciones;

        public TablaTipos(IDictionary<string, double> relaciones = null)
        {
            _relaciones = relaciones == null
                ? new Dictionary<string, double>()
                : new Dictionary<string, double>(relaciones);
        }

        public static TablaTipos CrearPorDefecto()
        {
            var relaciones = new Dictionary<string, double>
            {
                { "Planta>Fuego", 0.5 }, { "Planta>Agua", 2 }, { "Planta>Tierra", 2 },
                { "Planta>Planta", 0.5 }, { "Planta>Viento", 0.5 },
                { "Fuego>Planta", 2 }, { "Fuego>Hielo", 2 }, { "Fuego>Agua", 0.5 },
                { "Fuego>Fuego", 0.5 }, { "Fuego>Tierra", 0.5 },
                { "Agua>Fuego", 2 }, { "Agua>Tierra", 2 }, { "Agua>Planta", 0.5 },
                { "Agua>Agua", 0.5 }, { "Agua>Eléctrico", 0.5 },
                { "Viento>Planta", 2 }, { "Viento>Tierra", 2 }, { "Viento>Viento", 0.5 },
                { "Viento>Eléctrico", 0.5 }, { "Viento>Hielo", 0.5 },
                { "Hielo>Planta", 2 }, { "Hielo>Viento", 2 }, { "Hielo>Tierra", 2 },
                { "Hielo>Fuego", 0.5 }, { "Hielo>Agua", 0.5 }, { "Hielo>Hielo", 0.5 },
                { "Tierra>Fuego", 2 }, { "Tierra>Eléctrico", 2 }, { "Tierra>Planta", 0.5 },
                { "Tierra>Viento", 0.5 },
                { "Eléctrico>Agua", 2 }, { "Eléctrico>Viento", 2 },
                { "Eléctrico>Eléctrico", 0.5 }, { "Eléctrico>Planta", 0.5 }, { "Eléctrico>Tierra", 0.5 },
                { "Oscuro>Sagrado", 2 }, { "Oscuro>Oscuro", 0.5 }, { "Oscuro>Neutro", 0.5 },
                { "Sagrado>Oscuro", 2 }, { "Sagrado>Sagrado", 0.5 }, { "Sagrado>Neutro", 0.5 },
            };
            return new TablaTipos(relaciones);
        }

        public void Asignar(string atacante, string defensor, double multiplicador)
        {
            _relaciones[atacante + ">" + defensor] = multiplicador;
        }

        public double Multiplicador(string atacante, string defensor)
        {
            double valor;
            return _relaciones.TryGetValue(atacante + ">" + defensor, out valor) ? valor : 1;
        }
    }
}
