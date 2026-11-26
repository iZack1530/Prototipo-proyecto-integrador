namespace HorizonMythos.Nucleo.Combate
{
    /// <summary>
    /// Acción que envía un jugador. Se aceptan los nombres del contrato (atacar, cambiar,
    /// usarObjeto) y los códigos cortos del Laboratorio (atk, sw, it, pr, rc).
    /// </summary>
    public sealed class Accion
    {
        public string Tipo { get; set; }
        public string MovimientoId { get; set; }
        public string Objetivo { get; set; }
        public string Objeto { get; set; }
        public string IndiceObjetivo { get; set; }
        public string CambioIndice { get; set; }
        public string Pivote { get; set; }

        public static Accion Atacar(string movimientoId, string objetivo)
        {
            return new Accion { Tipo = "atacar", MovimientoId = movimientoId, Objetivo = objetivo };
        }

        public static Accion Cambiar(int indice)
        {
            return new Accion { Tipo = "cambiar", CambioIndice = indice.ToString() };
        }

        public static Accion UsarObjeto(string objeto, string indiceObjetivo)
        {
            return new Accion { Tipo = "usarObjeto", Objeto = objeto, IndiceObjetivo = indiceObjetivo };
        }

        public static Accion Guardar() => new Accion { Tipo = "guardar" };

        public static Accion Recuperar() => new Accion { Tipo = "recuperar" };

        public static Accion Emergencia(string objetivo)
        {
            return new Accion { Tipo = "emergencia", Objetivo = objetivo };
        }

        public string Codigo
        {
            get
            {
                switch (Tipo)
                {
                    case "atacar": return "atk";
                    case "cambiar": return "sw";
                    case "usarObjeto": return "it";
                    case "guardar": return "pr";
                    case "recuperar": return "rc";
                    case "emergencia": return "em";
                    default: return Tipo ?? "";
                }
            }
        }
    }
}
