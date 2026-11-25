using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HorizonMythos.Servidor.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "repeticiones",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Semilla = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Formato = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    EquipoAJson = table.Column<string>(type: "jsonb", nullable: false),
                    EquipoBJson = table.Column<string>(type: "jsonb", nullable: false),
                    AccionesJson = table.Column<string>(type: "jsonb", nullable: false),
                    EventosJson = table.Column<string>(type: "jsonb", nullable: false),
                    Ganador = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    CreadaEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_repeticiones", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "usuarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NombreVisible = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Correo = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    HashContrasena = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TokenRecuperacion = table.Column<string>(type: "text", nullable: true),
                    TokenRecuperacionExpira = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "clasificaciones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    Formato = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Puntos = table.Column<double>(type: "double precision", nullable: false, defaultValue: 1000.0),
                    Partidas = table.Column<int>(type: "integer", nullable: false),
                    Victorias = table.Column<int>(type: "integer", nullable: false),
                    Derrotas = table.Column<int>(type: "integer", nullable: false),
                    ActualizadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_clasificaciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_clasificaciones_usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "equipos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Formato = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CriaturasJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_equipos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_equipos_usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "obras_galeria",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Titulo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Artista = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Fecha = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Etiquetas = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    CriaturaRelacionada = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    AutorId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreadaEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_obras_galeria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_obras_galeria_usuarios_AutorId",
                        column: x => x.AutorId,
                        principalTable: "usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_clasificaciones_UsuarioId_Formato",
                table: "clasificaciones",
                columns: new[] { "UsuarioId", "Formato" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_equipos_UsuarioId",
                table: "equipos",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_obras_galeria_AutorId",
                table: "obras_galeria",
                column: "AutorId");

            migrationBuilder.CreateIndex(
                name: "IX_obras_galeria_CreadaEn",
                table: "obras_galeria",
                column: "CreadaEn");

            migrationBuilder.CreateIndex(
                name: "IX_repeticiones_CreadaEn",
                table: "repeticiones",
                column: "CreadaEn");

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_Correo",
                table: "usuarios",
                column: "Correo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_NombreVisible",
                table: "usuarios",
                column: "NombreVisible",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "clasificaciones");

            migrationBuilder.DropTable(
                name: "equipos");

            migrationBuilder.DropTable(
                name: "obras_galeria");

            migrationBuilder.DropTable(
                name: "repeticiones");

            migrationBuilder.DropTable(
                name: "usuarios");
        }
    }
}
