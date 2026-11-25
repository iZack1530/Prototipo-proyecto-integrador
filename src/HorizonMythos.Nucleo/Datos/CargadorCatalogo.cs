using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using HorizonMythos.Nucleo.Modelos;

namespace HorizonMythos.Nucleo.Datos
{
    /// <summary>
    /// Carga el catálogo desde datos_prueba.json (v5) o desde el paquete Unity v3
    /// exportado por el Laboratorio. Sin paquetes externos: usa JsonLigero.
    /// </summary>
    public static class CargadorCatalogo
    {
        public static readonly IReadOnlyList<string> TiposPorDefecto = new List<string>
        {
            "Fuego", "Planta", "Agua", "Viento", "Hielo", "Tierra", "Eléctrico",
            "Roca", "Tóxico", "Metal", "Oscuro", "Sagrado", "Neutro"
        };

        public static Catalogo CargarDatosPrueba(string json)
        {
            object raiz = JsonLigero.Analizar(json);
            var catalogo = new Catalogo
            {
                Version = JsonLigero.Entero(JsonLigero.Obtener(raiz, "version"), 5),
                Tipos = TiposPorDefecto,
                Tabla = TablaTipos.CrearPorDefecto()
            };

            var criaturas = new List<Criatura>();
            foreach (object item in JsonLigero.Lista(JsonLigero.Obtener(raiz, "criaturas")))
            {
                object baseDatos = JsonLigero.Obtener(item, "base");
                object esfuerzo = JsonLigero.Obtener(item, "ev");
                object formulas = JsonLigero.Obtener(item, "f");
                criaturas.Add(new Criatura
                {
                    Id = JsonLigero.Texto(JsonLigero.Obtener(item, "id")),
                    Nombre = JsonLigero.Texto(JsonLigero.Obtener(item, "nombre")),
                    Especie = JsonLigero.Texto(JsonLigero.Obtener(item, "especie")),
                    Tipos = JsonLigero.Textos(JsonLigero.Obtener(item, "tipos")),
                    HabilidadNombre = JsonLigero.Texto(JsonLigero.Obtener(item, "hab")),
                    HabilidadId = JsonLigero.Texto(JsonLigero.Obtener(item, "habId")),
                    DescripcionHabilidad = JsonLigero.Texto(JsonLigero.Obtener(item, "habd")),
                    Ataques = JsonLigero.Textos(JsonLigero.Obtener(item, "atk")),
                    Aprendibles = JsonLigero.Textos(JsonLigero.Obtener(item, "learn")),
                    Nivel = JsonLigero.Entero(JsonLigero.Obtener(item, "nivel"), 50),
                    Cap = JsonLigero.Entero(JsonLigero.Obtener(item, "cap"), 480),
                    Base = LeerNumeros(baseDatos),
                    Esfuerzo = LeerNumeros(esfuerzo),
                    Formulas = LeerTextos(formulas),
                    Sincronizada = JsonLigero.Booleano(JsonLigero.Obtener(item, "sync"))
                });
            }

            var ataques = new List<Ataque>();
            foreach (object item in JsonLigero.Lista(JsonLigero.Obtener(raiz, "ataques")))
            {
                string categoriaCritico = JsonLigero.Texto(JsonLigero.Obtener(item, "crit"), "bajo");
                double probabilidad;
                if (!Reglas.Criticos.TryGetValue(categoriaCritico, out probabilidad)) probabilidad = 5;
                ataques.Add(new Ataque
                {
                    Id = JsonLigero.Texto(JsonLigero.Obtener(item, "id")),
                    Nombre = JsonLigero.Texto(JsonLigero.Obtener(item, "nombre")),
                    Descripcion = JsonLigero.Texto(JsonLigero.Obtener(item, "desc")),
                    Tipo = JsonLigero.Texto(JsonLigero.Obtener(item, "tipo"), "Neutro"),
                    Mp = JsonLigero.Entero(JsonLigero.Obtener(item, "mp")),
                    Categoria = JsonLigero.Texto(JsonLigero.Obtener(item, "cat"), "fis"),
                    Potencia = JsonLigero.Numero(JsonLigero.Obtener(item, "pot")),
                    Alcance = JsonLigero.Texto(JsonLigero.Obtener(item, "alc"), "uni"),
                    Aoe = JsonLigero.Numero(JsonLigero.Obtener(item, "aoe"), 75),
                    Rebotes = LeerListaNumeros(JsonLigero.Obtener(item, "reb")),
                    Prioridad = JsonLigero.Entero(JsonLigero.Obtener(item, "prio")),
                    Critico = categoriaCritico,
                    ProbabilidadCritico = probabilidad,
                    Contacto = JsonLigero.Booleano(JsonLigero.Obtener(item, "con")),
                    Efectos = LeerEfectos(JsonLigero.Obtener(item, "fx"))
                });
            }

            var habilidades = new List<Habilidad>();
            foreach (object item in JsonLigero.Lista(JsonLigero.Obtener(raiz, "habilidades")))
            {
                habilidades.Add(new Habilidad
                {
                    Id = JsonLigero.Texto(JsonLigero.Obtener(item, "id")),
                    Nombre = JsonLigero.Texto(JsonLigero.Obtener(item, "nombre")),
                    Descripcion = JsonLigero.Texto(JsonLigero.Obtener(item, "desc")),
                    Efectos = LeerEfectos(JsonLigero.Obtener(item, "fx"))
                });
            }

            catalogo.Criaturas = criaturas;
            catalogo.Ataques = ataques;
            catalogo.Habilidades = habilidades;
            catalogo.Objetos = ObjetosPorDefecto();
            catalogo.Indizar();
            return catalogo;
        }

        /// <summary>Lee el paquete «rpg-lab-datos» con esquema 5 exportado para Unity.</summary>
        public static Catalogo CargarPaqueteUnityV3(string json)
        {
            object raiz = JsonLigero.Analizar(json);
            string formato = JsonLigero.Texto(JsonLigero.Obtener(raiz, "formato"));
            if (formato != "rpg-lab-datos")
                throw new FormatException("No es un paquete de datos de Unity v3");

            var nombresPorId = new Dictionary<string, string>();
            var tipos = new List<string>();
            foreach (object item in JsonLigero.Lista(JsonLigero.Obtener(raiz, "tipos")))
            {
                string id = JsonLigero.Texto(JsonLigero.Obtener(item, "id"));
                string nombre = JsonLigero.Texto(JsonLigero.Obtener(item, "nombre"));
                tipos.Add(nombre);
                if (id.Length > 0) nombresPorId[id] = nombre;
            }

            var relaciones = new Dictionary<string, double>();
            object tabla = JsonLigero.Obtener(raiz, "tablaTipos");
            foreach (object item in JsonLigero.Lista(JsonLigero.Obtener(tabla, "relaciones")))
            {
                string atacante = NombreDe(JsonLigero.Obtener(item, "atacanteId"), nombresPorId,
                    JsonLigero.Texto(JsonLigero.Obtener(item, "atacanteNombre")));
                string defensor = NombreDe(JsonLigero.Obtener(item, "defensorId"), nombresPorId,
                    JsonLigero.Texto(JsonLigero.Obtener(item, "defensorNombre")));
                relaciones[atacante + ">" + defensor] = JsonLigero.Numero(JsonLigero.Obtener(item, "mult"), 1);
            }

            var catalogo = new Catalogo
            {
                Version = JsonLigero.Entero(JsonLigero.Obtener(raiz, "schema"), 5),
                Tipos = tipos.Count > 0 ? tipos : TiposPorDefecto,
                Tabla = relaciones.Count > 0 ? new TablaTipos(relaciones) : TablaTipos.CrearPorDefecto()
            };

            var criaturas = new List<Criatura>();
            foreach (object item in JsonLigero.Lista(JsonLigero.Obtener(raiz, "criaturas")))
            {
                criaturas.Add(new Criatura
                {
                    Id = JsonLigero.Texto(JsonLigero.Obtener(item, "id")),
                    Nombre = JsonLigero.Texto(JsonLigero.Obtener(item, "nombre")),
                    Especie = JsonLigero.Texto(JsonLigero.Obtener(item, "especie")),
                    Tipos = NombresDe(JsonLigero.Obtener(item, "tipoIds"), nombresPorId),
                    HabilidadId = JsonLigero.Texto(JsonLigero.Obtener(item, "habilidadId")),
                    Ataques = JsonLigero.Textos(JsonLigero.Obtener(item, "ataqueIds")),
                    Aprendibles = JsonLigero.Textos(JsonLigero.Obtener(item, "ataquesAprendibles")),
                    Nivel = JsonLigero.Entero(JsonLigero.Obtener(item, "nivel"), 50),
                    Cap = JsonLigero.Entero(JsonLigero.Obtener(item, "esfuerzoMax"), 480),
                    Base = LeerNumeros(JsonLigero.Obtener(item, "base")),
                    Esfuerzo = LeerNumeros(JsonLigero.Obtener(item, "esfuerzo")),
                    Formulas = LeerTextos(JsonLigero.Obtener(item, "formulas"))
                });
            }

            var ataques = new List<Ataque>();
            foreach (object item in JsonLigero.Lista(JsonLigero.Obtener(raiz, "ataques")))
            {
                string critico = JsonLigero.Texto(JsonLigero.Obtener(item, "critico"), "bajo");
                double probabilidad = JsonLigero.Numero(JsonLigero.Obtener(item, "criticoProb"), 5);
                ataques.Add(new Ataque
                {
                    Id = JsonLigero.Texto(JsonLigero.Obtener(item, "id")),
                    Nombre = JsonLigero.Texto(JsonLigero.Obtener(item, "nombre")),
                    Descripcion = JsonLigero.Texto(JsonLigero.Obtener(item, "desc")),
                    Tipo = NombreDe(JsonLigero.Obtener(item, "tipoId"), nombresPorId,
                        JsonLigero.Texto(JsonLigero.Obtener(item, "tipoNombre"), "Neutro")),
                    Mp = JsonLigero.Entero(JsonLigero.Obtener(item, "mp")),
                    Categoria = JsonLigero.Texto(JsonLigero.Obtener(item, "cat"), "fis"),
                    Potencia = JsonLigero.Numero(JsonLigero.Obtener(item, "pot")),
                    Alcance = JsonLigero.Texto(JsonLigero.Obtener(item, "alc"), "uni"),
                    Aoe = JsonLigero.Numero(JsonLigero.Obtener(item, "aoe"), 75),
                    Rebotes = LeerListaNumeros(JsonLigero.Obtener(item, "reb")),
                    Prioridad = JsonLigero.Entero(JsonLigero.Obtener(item, "prio")),
                    Critico = critico,
                    ProbabilidadCritico = probabilidad,
                    Efectos = LeerEfectos(JsonLigero.Obtener(item, "fx"))
                });
            }

            var habilidades = new List<Habilidad>();
            foreach (object item in JsonLigero.Lista(JsonLigero.Obtener(raiz, "habilidades")))
            {
                habilidades.Add(new Habilidad
                {
                    Id = JsonLigero.Texto(JsonLigero.Obtener(item, "id")),
                    Nombre = JsonLigero.Texto(JsonLigero.Obtener(item, "nombre")),
                    Descripcion = JsonLigero.Texto(JsonLigero.Obtener(item, "desc")),
                    Efectos = LeerEfectos(JsonLigero.Obtener(item, "fx"))
                });
            }

            catalogo.Criaturas = criaturas;
            catalogo.Ataques = ataques;
            catalogo.Habilidades = habilidades;
            catalogo.Objetos = LeerObjetos(JsonLigero.Obtener(raiz, "objetos"));
            if (catalogo.Objetos.Count == 0) catalogo.Objetos = ObjetosPorDefecto();
            catalogo.Indizar();
            return catalogo;
        }

        private static IReadOnlyList<Efecto> LeerEfectos(object valor)
        {
            var efectos = new List<Efecto>();
            foreach (object item in JsonLigero.Lista(valor))
            {
                var datos = JsonLigero.ComoObjeto(item);
                if (datos == null) continue;
                var copia = new Dictionary<string, object>(datos);
                string clave = JsonLigero.Texto(JsonLigero.Obtener(datos, "k"), "");

                // mapFx() sustituye «tipo» por «tipoId»/«tipoNombre» en el paquete v3.
                if (!copia.ContainsKey("tipo"))
                {
                    string nombreTipo = JsonLigero.Texto(JsonLigero.Obtener(datos, "tipoNombre"));
                    if (nombreTipo.Length > 0) copia["tipo"] = nombreTipo;
                }
                if (!copia.ContainsKey("e"))
                {
                    string estadoId = JsonLigero.Texto(JsonLigero.Obtener(datos, "estadoId"));
                    if (estadoId.StartsWith("estado.", StringComparison.Ordinal))
                        copia["e"] = NombreEstado(estadoId.Substring(7));
                }
                if (!copia.ContainsKey("w"))
                {
                    string climaId = JsonLigero.Texto(JsonLigero.Obtener(datos, "climaId"));
                    if (climaId.Length > 0) copia["w"] = climaId;
                }
                efectos.Add(new Efecto(clave, copia));
            }
            return efectos;
        }

        private static string NombreEstado(string slug)
        {
            foreach (string nombre in Reglas.Estados.Keys)
                if (Slug(nombre) == slug) return nombre;
            return slug;
        }

        private static string Slug(string texto)
        {
            string normalizado = texto.Normalize(NormalizationForm.FormD);
            var resultado = new StringBuilder();
            foreach (char c in normalizado)
            {
                UnicodeCategory categoria = CharUnicodeInfo.GetUnicodeCategory(c);
                if (categoria == UnicodeCategory.NonSpacingMark) continue;
                resultado.Append(char.ToLowerInvariant(c));
            }
            return resultado.ToString().Replace(' ', '-');
        }

        private static IReadOnlyDictionary<string, double> LeerNumeros(object valor)
        {
            var resultado = new Dictionary<string, double>();
            var objeto = JsonLigero.ComoObjeto(valor);
            if (objeto == null) return resultado;
            foreach (KeyValuePair<string, object> par in objeto)
                resultado[par.Key] = JsonLigero.Numero(par.Value);
            return resultado;
        }

        private static IReadOnlyDictionary<string, string> LeerTextos(object valor)
        {
            var resultado = new Dictionary<string, string>();
            var objeto = JsonLigero.ComoObjeto(valor);
            if (objeto == null) return resultado;
            foreach (KeyValuePair<string, object> par in objeto)
                resultado[par.Key] = JsonLigero.Texto(par.Value);
            return resultado;
        }

        private static IReadOnlyList<double> LeerListaNumeros(object valor)
        {
            var resultado = new List<double>();
            foreach (object item in JsonLigero.Lista(valor))
                resultado.Add(JsonLigero.Numero(item));
            return resultado;
        }

        private static IReadOnlyList<string> NombresDe(object valor, IDictionary<string, string> nombresPorId)
        {
            var resultado = new List<string>();
            foreach (object item in JsonLigero.Lista(valor))
            {
                string id = JsonLigero.Texto(item);
                resultado.Add(NombreDe(id, nombresPorId, id));
            }
            return resultado;
        }

        private static string NombreDe(object idValor, IDictionary<string, string> nombresPorId, string defecto)
        {
            string id = JsonLigero.Texto(idValor);
            string nombre;
            return id.Length > 0 && nombresPorId.TryGetValue(id, out nombre) ? nombre : defecto;
        }

        private static IReadOnlyList<Objeto> ObjetosPorDefecto()
        {
            var objetos = new List<Objeto>();
            foreach (KeyValuePair<string, Dictionary<string, double>> par in Reglas.ObjetosPasivos)
                objetos.Add(new Objeto { Id = "obj.pas." + Slug(par.Key), Nombre = par.Key, Grupo = "pasivo", Multiplicadores = par.Value });
            foreach (KeyValuePair<string, Dictionary<string, double>> par in Reglas.ObjetosOfensivos)
                objetos.Add(new Objeto { Id = "obj.ofe." + Slug(par.Key), Nombre = par.Key, Grupo = "ofensivo", Multiplicadores = par.Value });
            foreach (KeyValuePair<string, Dictionary<string, double>> par in Reglas.Consumibles)
                objetos.Add(new Objeto
                {
                    Id = "obj.con." + Slug(par.Key),
                    Nombre = par.Key,
                    Grupo = "consumible",
                    TipoEfecto = par.Value.ContainsKey("tipo") && par.Value["tipo"] == 0 ? "hp"
                        : par.Value.ContainsKey("tipo") && par.Value["tipo"] == 1 ? "mp" : "cura",
                    Potencia = par.Value.ContainsKey("potencia") ? par.Value["potencia"] : 0,
                    CantidadInicial = Reglas.MochilaInicial.ContainsKey(par.Key) ? Reglas.MochilaInicial[par.Key] : 0
                });
            return objetos;
        }

        private static IReadOnlyList<Objeto> LeerObjetos(object valor)
        {
            var objetos = new List<Objeto>();
            if (valor == null) return objetos;
            var grupos = JsonLigero.ComoObjeto(valor);
            if (grupos == null) return objetos;
            foreach (KeyValuePair<string, object> grupo in grupos)
            {
                string nombreGrupo = grupo.Key == "pasivos" ? "pasivo"
                    : grupo.Key == "ofensivos" ? "ofensivo" : "consumible";
                foreach (object item in JsonLigero.Lista(grupo.Value))
                {
                    object multiplicadores = JsonLigero.Obtener(item, "mult");
                    object efecto = JsonLigero.Obtener(item, "efecto");
                    objetos.Add(new Objeto
                    {
                        Id = JsonLigero.Texto(JsonLigero.Obtener(item, "id")),
                        Nombre = JsonLigero.Texto(JsonLigero.Obtener(item, "nombre")),
                        Grupo = nombreGrupo,
                        Multiplicadores = LeerNumeros(multiplicadores),
                        TipoEfecto = JsonLigero.Texto(JsonLigero.Obtener(efecto, "tipo")),
                        Potencia = JsonLigero.Numero(JsonLigero.Obtener(efecto, "potencia")),
                        CantidadInicial = JsonLigero.Entero(JsonLigero.Obtener(item, "cantidadInicial"))
                    });
                }
            }
            return objetos;
        }
    }
}
