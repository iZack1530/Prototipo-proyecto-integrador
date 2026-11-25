using System.Text.Json;
using HorizonMythos.Servidor.Persistencia;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HorizonMythos.Servidor.Pruebas;

public sealed class CombateEnLineaTests
{
    [Fact]
    public async Task DosClientesCompletanUnCombateYReconectan()
    {
        using var fabrica = new FabricaServidor();
        await using HubConnection ana = await FabricaServidor.ConectarHubAsync(fabrica);
        await using HubConnection bruno = await FabricaServidor.ConectarHubAsync(fabrica);

        var emparejadaAna = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        var emparejadoBruno = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        var fin = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

        ana.On<JsonElement>("Emparejado", carga =>
            emparejadaAna.TrySetResult(carga.GetProperty("salaId").GetString() ?? ""));
        bruno.On<JsonElement>("Emparejado", carga =>
            emparejadoBruno.TrySetResult(carga.GetProperty("salaId").GetString() ?? ""));
        ana.On<JsonElement>("Fin", _ => fin.TrySetResult(true));
        bruno.On<JsonElement>("Fin", _ => fin.TrySetResult(true));

        Assert.Null(await ana.InvokeAsync<string?>("UnirseCola", "3v3", new List<string>(), "ana"));
        string? sala = await bruno.InvokeAsync<string?>("UnirseCola", "3v3", new List<string>(), "bruno");

        string salaAna = await emparejadaAna.Task.WaitAsync(TimeSpan.FromSeconds(15));
        string salaBruno = await emparejadoBruno.Task.WaitAsync(TimeSpan.FromSeconds(15));
        Assert.Equal(salaAna, salaBruno);
        Assert.Equal(salaAna, sala);

        for (int i = 0; i < 3; i++)
        {
            await ana.InvokeAsync("EnviarAccion", salaAna, Emergency("1:0"));
            await bruno.InvokeAsync("EnviarAccion", salaBruno, Emergency("0:0"));
            await Task.Delay(120);
        }

        // Ana se cae a mitad del combate y vuelve con otra conexión.
        await ana.DisposeAsync();
        await using HubConnection anaReconectada = await FabricaServidor.ConectarHubAsync(fabrica);
        var reconectada = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        anaReconectada.On<JsonElement>("Reconectado", _ => reconectada.TrySetResult(true));

        bool reconexion = await anaReconectada.InvokeAsync<bool>("ReconectarSala", salaAna, "ana");
        Assert.True(reconexion);
        await reconectada.Task.WaitAsync(TimeSpan.FromSeconds(15));

        for (int i = 0; i < 120 && !fin.Task.IsCompleted; i++)
        {
            await anaReconectada.InvokeAsync("EnviarAccion", salaAna, Emergency("1:0"));
            await bruno.InvokeAsync("EnviarAccion", salaBruno, Emergency("0:0"));
            await Task.Delay(100);
        }

        await fin.Task.WaitAsync(TimeSpan.FromSeconds(30));

        using IServiceScope ambito = fabrica.Services.CreateScope();
        ContextoBd bd = ambito.ServiceProvider.GetRequiredService<ContextoBd>();
        Repeticion? repeticion = await bd.Repeticiones.FirstOrDefaultAsync(r => r.Id == salaAna);
        Assert.NotNull(repeticion);
        Assert.Equal("3v3", repeticion!.Formato);

        using HttpClient cliente = fabrica.CreateClient();
        HttpResponseMessage respuesta = await cliente.GetAsync($"/api/repeticiones/{salaAna}");
        respuesta.EnsureSuccessStatusCode();
        string cuerpo = await respuesta.Content.ReadAsStringAsync();
        Assert.Contains("\"semilla\"", cuerpo);
    }

    [Fact]
    public async Task DesafioPorNombre_EmparejaAAmbosJugadores()
    {
        using var fabrica = new FabricaServidor();
        await using HubConnection ana = await FabricaServidor.ConectarHubAsync(fabrica);
        await using HubConnection bruno = await FabricaServidor.ConectarHubAsync(fabrica);

        var salaAna = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        var salaBruno = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        var desafiado = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);

        ana.On<JsonElement>("Emparejado", carga =>
            salaAna.TrySetResult(carga.GetProperty("salaId").GetString() ?? ""));
        bruno.On<JsonElement>("Emparejado", carga =>
            salaBruno.TrySetResult(carga.GetProperty("salaId").GetString() ?? ""));
        bruno.On<JsonElement>("Desafiado", carga =>
            desafiado.TrySetResult(carga.GetProperty("retador").GetString() ?? ""));

        Assert.Equal("ana", await ana.InvokeAsync<string>("Identificarse", "ana"));
        Assert.Equal("bruno", await bruno.InvokeAsync<string>("Identificarse", "bruno"));

        string? sala = await ana.InvokeAsync<string?>("Desafiar", "bruno", "3v3",
            new List<string>(), "ana");

        Assert.False(string.IsNullOrWhiteSpace(sala));
        Assert.Equal(sala, await salaAna.Task.WaitAsync(TimeSpan.FromSeconds(15)));
        Assert.Equal(sala, await salaBruno.Task.WaitAsync(TimeSpan.FromSeconds(15)));
        Assert.Equal("ana", await desafiado.Task.WaitAsync(TimeSpan.FromSeconds(15)));
    }

    private static object Emergency(string objetivo) => new
    {
        Tipo = "emergencia",
        Objetivo = objetivo
    };
}
