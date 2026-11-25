using System.Collections.Generic;
using HorizonMythos.Nucleo.Datos;

namespace HorizonMythos.Nucleo.Modelos
{
    /// <summary>Efecto de un ataque o habilidad; conserva los campos del JSON original.</summary>
    public sealed class Efecto
    {
        public Efecto(string clave, IReadOnlyDictionary<string, object> datos)
        {
            Clave = clave;
            Datos = datos ?? new Dictionary<string, object>();
        }

        public string Clave { get; }
        public IReadOnlyDictionary<string, object> Datos { get; }

        public bool Tiene(string campo) => Datos.ContainsKey(campo);

        public string Texto(string campo, string defecto = "")
        {
            object valor;
            if (!Datos.TryGetValue(campo, out valor)) return defecto;
            string texto = JsonLigero.Texto(valor);
            return texto.Length > 0 ? texto : defecto;
        }

        public double Numero(string campo, double defecto = 0)
        {
            object valor;
            return Datos.TryGetValue(campo, out valor) ? JsonLigero.Numero(valor, defecto) : defecto;
        }

        public int Entero(string campo, int defecto = 0) => (int)Numero(campo, defecto);
    }
}
