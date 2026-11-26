using System;
using System.Collections.Generic;
using System.Linq;
using HorizonMythos.Nucleo.Combate;
using HorizonMythos.Nucleo.Datos;
using HorizonMythos.Nucleo.Formatos;
using HorizonMythos.Nucleo.Modelos;

namespace HorizonMythos.Nucleo.Repeticiones
{
    /// <summary>
    /// Ejecuta una repetición determinista: la misma semilla, equipos y acciones producen
    /// exactamente los mismos eventos. Es el contrato usado por servidor y simulador.
    /// </summary>
    public sealed class GestorRepeticiones
    {
        private readonly Catalogo _catalogo;

        public GestorRepeticiones(Catalogo catalogo)
        {
            _catalogo = catalogo ?? throw new ArgumentNullException(nameof(catalogo));
        }

        public ResultadoRepeticion Ejecutar(Repeticion repeticion)
        {
            if (repeticion == null) throw new ArgumentNullException(nameof(repeticion));
            Formato formato = FormatoLaboratorio(repeticion.Formato);
            Batalla batalla = Batalla.Crear(_catalogo, repeticion.EquipoA, repeticion.EquipoB,
                formato, repeticion.Semilla ?? string.Empty);

            var acciones = new List<object>();
            foreach (IReadOnlyList<object> turno in repeticion.Acciones)
            {
                var declaradas = new List<object>();
                var accionesTurno = new List<Accion>();
                foreach (object item in turno)
                {
                    Accion accion = LeerAccion(item);
                    accionesTurno.Add(accion ?? new Accion { Tipo = "guardar" });
                    declaradas.Add(item);
                }
                acciones.Add(declaradas);
                batalla.ResolverTurno(accionesTurno.ToArray());
                if (batalla.Terminado) break;
            }

            return new ResultadoRepeticion
            {
                Id = repeticion.Id,
                Semilla = repeticion.Semilla,
                EquipoA = repeticion.EquipoA,
                EquipoB = repeticion.EquipoB,
                Acciones = acciones,
                Eventos = batalla.Historial.Select(e => (object)e.Mensaje).ToList(),
                Estado = ConvertirEstado(batalla.ObtenerEstado())
            };
        }

        /// <summary>Analiza el JSON de una repetición del vector del Laboratorio.</summary>
        public static Repeticion Leer(string json)
        {
            object raiz = JsonLigero.Analizar(json);
            object equipos = JsonLigero.Obtener(raiz, "equipos");
            IReadOnlyList<object> listaEquipos = JsonLigero.Lista(equipos);
            var acciones = new List<IReadOnlyList<object>>();
            foreach (object turno in JsonLigero.Lista(JsonLigero.Obtener(raiz, "acciones")))
            {
                var accionesLado = new List<IReadOnlyList<object>>();
                foreach (object lado in JsonLigero.Lista(turno))
                    accionesLado.Add(JsonLigero.Lista(lado));
                acciones.Add(ConvertirAcciones(accionesLado));
            }
            return new Repeticion
            {
                Id = JsonLigero.Texto(JsonLigero.Obtener(raiz, "id")),
                Semilla = JsonLigero.Texto(JsonLigero.Obtener(raiz, "semilla")),
                Formato = JsonLigero.Texto(JsonLigero.Obtener(raiz, "formato"), "laboratorio"),
                EquipoA = JsonLigero.Textos(listaEquipos.Count > 0 ? listaEquipos[0] : null),
                EquipoB = JsonLigero.Textos(listaEquipos.Count > 1 ? listaEquipos[1] : null),
                Acciones = acciones
            };
        }

        private static IReadOnlyList<object> ConvertirAcciones(IReadOnlyList<IReadOnlyList<object>> lados)
        {
            var resultado = new List<object>();
            int porLado = lados.Count > 0 ? lados[0].Count : 0;
            for (int pos = 0; pos < porLado; pos++)
                for (int lado = 0; lado < lados.Count; lado++)
                    if (pos < lados[lado].Count) resultado.Add(lados[lado][pos]);
            return resultado;
        }

        private static Formato FormatoLaboratorio(string id)
        {
            switch (id)
            {
                case "3v3": return Formato.TresVsTres;
                case "5v5-elige-3": return Formato.CincoEligeTres;
                default: return Formato.Laboratorio;
            }
        }

        private static Accion LeerAccion(object item)
        {
            var datos = JsonLigero.ComoObjeto(item);
            if (datos == null) return null;
            string tipo = JsonLigero.Texto(JsonLigero.Obtener(datos, "t"));
            switch (tipo)
            {
                case "atk": return Accion.Atacar(JsonLigero.Texto(JsonLigero.Obtener(datos, "m")),
                    JsonLigero.Texto(JsonLigero.Obtener(datos, "tg"), "1:0"));
                case "sw": return Accion.Cambiar(JsonLigero.Entero(JsonLigero.Obtener(datos, "i")));
                case "it": return Accion.UsarObjeto(JsonLigero.Texto(JsonLigero.Obtener(datos, "o"), "Poción"),
                    JsonLigero.Texto(JsonLigero.Obtener(datos, "tg"), "0:0"));
                case "pr": return Accion.Guardar();
                case "rc": return Accion.Recuperar();
                case "em": return Accion.Emergencia(JsonLigero.Texto(JsonLigero.Obtener(datos, "tg"), "1:0"));
                default: return null;
            }
        }

        private static object ConvertirEstado(EstadoCombate estado)
        {
            var activos = new List<object>();
            var unidades = new List<object>();
            for (int lado = 0; lado < 2; lado++)
            {
                activos.Add(estado.A[lado]);
                var equipo = new List<object>();
                foreach (UnidadEstado u in estado.U[lado])
                    equipo.Add(new Dictionary<string, object>
                    {
                        { "hp", u.Hp }, { "mx", u.Mx }, { "mp", u.Mp }, { "mm", u.Mm },
                        { "ko", u.Ko }, { "st", u.St }, { "bo", u.Bo }, { "tr", u.Tr },
                        { "gc", u.Gc }, { "cd", u.Cd }, { "pr", u.Pr }, { "rc", u.Rc }
                    });
                unidades.Add(equipo);
            }
            return new Dictionary<string, object>
            {
                { "n", estado.N }, { "w", estado.W }, { "a", activos }, { "u", unidades }
            };
        }
    }
}
