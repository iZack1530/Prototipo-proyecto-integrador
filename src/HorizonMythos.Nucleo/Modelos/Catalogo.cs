using System.Collections.Generic;

namespace HorizonMythos.Nucleo.Modelos
{
    /// <summary>Conjunto de datos compartido por el motor, el servidor y Unity.</summary>
    public sealed class Catalogo
    {
        private readonly Dictionary<string, Criatura> _criaturas = new Dictionary<string, Criatura>();
        private readonly Dictionary<string, Ataque> _ataques = new Dictionary<string, Ataque>();
        private readonly Dictionary<string, Habilidad> _habilidades = new Dictionary<string, Habilidad>();
        private readonly Dictionary<string, Objeto> _objetos = new Dictionary<string, Objeto>();

        public int Version { get; set; }
        public IReadOnlyList<string> Tipos { get; set; } = new List<string>();
        public TablaTipos Tabla { get; set; } = TablaTipos.CrearPorDefecto();
        public IReadOnlyList<Criatura> Criaturas { get; set; } = new List<Criatura>();
        public IReadOnlyList<Ataque> Ataques { get; set; } = new List<Ataque>();
        public IReadOnlyList<Habilidad> Habilidades { get; set; } = new List<Habilidad>();
        public IReadOnlyList<Objeto> Objetos { get; set; } = new List<Objeto>();
        public IReadOnlyDictionary<string, Clima> Climas { get; set; } = Reglas.Climas;

        public void Indizar()
        {
            _criaturas.Clear(); _ataques.Clear(); _habilidades.Clear(); _objetos.Clear();
            foreach (Criatura criatura in Criaturas) _criaturas[criatura.Id] = criatura;
            foreach (Ataque ataque in Ataques) _ataques[ataque.Id] = ataque;
            foreach (Habilidad habilidad in Habilidades) _habilidades[habilidad.Id] = habilidad;
            foreach (Objeto objeto in Objetos) _objetos[objeto.Id] = objeto;
        }

        public Criatura ObtenerCriatura(string id)
        {
            Criatura valor;
            return id != null && _criaturas.TryGetValue(id, out valor) ? valor : null;
        }

        public Ataque ObtenerAtaque(string id)
        {
            Ataque valor;
            return id != null && _ataques.TryGetValue(id, out valor) ? valor : null;
        }

        public Habilidad ObtenerHabilidad(string id)
        {
            Habilidad valor;
            return id != null && _habilidades.TryGetValue(id, out valor) ? valor : null;
        }

        public Habilidad ObtenerHabilidad(Criatura criatura)
        {
            if (criatura == null) return null;
            Habilidad habilidad = ObtenerHabilidad(criatura.HabilidadId);
            if (habilidad != null) return habilidad;
            foreach (Habilidad candidata in Habilidades)
                if (!string.IsNullOrEmpty(criatura.HabilidadNombre) && candidata.Nombre == criatura.HabilidadNombre)
                    return candidata;
            return null;
        }

        public Objeto ObtenerObjeto(string id)
        {
            Objeto valor;
            return id != null && _objetos.TryGetValue(id, out valor) ? valor : null;
        }
    }
}
