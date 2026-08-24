"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EventoInicial = {
  id: string;
  nome: string;
  local: string;
  data: string; // formato aceito por <input type="datetime-local">
  raioPedidosMetros: number | null;
  latitude: number | null;
  longitude: number | null;
};

type Modalidade = "ORGANIZADOR_UNICO" | "MULTI_ESTABELECIMENTO";

export function FormularioEvento({ eventoInicial }: { eventoInicial?: EventoInicial }) {
  const router = useRouter();
  // só existe na criação -- é uma escolha de uma vez só, ver lib/validarEvento.ts
  const [modalidade, setModalidade] = useState<Modalidade>("ORGANIZADOR_UNICO");
  const [nome, setNome] = useState(eventoInicial?.nome ?? "");
  const [local, setLocal] = useState(eventoInicial?.local ?? "");
  const [data, setData] = useState(eventoInicial?.data ?? "");
  const [temGeofencing, setTemGeofencing] = useState(
    eventoInicial ? eventoInicial.raioPedidosMetros !== null : false
  );
  const [raio, setRaio] = useState(
    eventoInicial?.raioPedidosMetros != null ? String(eventoInicial.raioPedidosMetros) : "300"
  );
  const [latitude, setLatitude] = useState(
    eventoInicial?.latitude != null ? String(eventoInicial.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    eventoInicial?.longitude != null ? String(eventoInicial.longitude) : ""
  );
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function usarLocalizacaoAtual() {
    if (!("geolocation" in navigator)) {
      setErro("Este navegador não suporta localização.");
      return;
    }
    setBuscandoLocalizacao(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setLatitude(String(posicao.coords.latitude));
        setLongitude(String(posicao.coords.longitude));
        setBuscandoLocalizacao(false);
      },
      () => {
        setErro("Não foi possível obter sua localização. Permita o acesso e tente novamente.");
        setBuscandoLocalizacao(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function salvar() {
    setErro(null);

    if (!nome.trim() || !local.trim() || !data) {
      setErro("Preencha nome, local e data do evento.");
      return;
    }
    if (temGeofencing && (!raio.trim() || !latitude.trim() || !longitude.trim())) {
      setErro("Preencha raio, latitude e longitude, ou desmarque o geofencing.");
      return;
    }

    setEnviando(true);
    try {
      const corpo = {
        nome: nome.trim(),
        local: local.trim(),
        data: new Date(data).toISOString(),
        raioPedidosMetros: temGeofencing ? Number(raio) : null,
        latitude: temGeofencing ? Number(latitude) : null,
        longitude: temGeofencing ? Number(longitude) : null,
        // só manda na criação -- edição nunca muda a modalidade (ver PATCH em api/eventos/[eventoId])
        ...(eventoInicial ? {} : { modalidade }),
      };

      const resposta = eventoInicial
        ? await fetch(`/api/eventos/${eventoInicial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo),
          })
        : await fetch("/api/eventos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo),
          });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar o evento.");
        setEnviando(false);
        return;
      }

      router.push(`/gestor/eventos/${eventoInicial?.id ?? dados.id}`);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      setEnviando(false);
    }
  }

  return (
    <div className="cartao">
      {!eventoInicial && (
        <div className="campo">
          <label>Que tipo de evento é esse?</label>
          <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setModalidade("ORGANIZADOR_UNICO")}
              style={{
                textAlign: "left",
                padding: "14px 16px",
                borderRadius: 12,
                border: `2px solid ${modalidade === "ORGANIZADOR_UNICO" ? "var(--verde)" : "var(--linha)"}`,
                background: modalidade === "ORGANIZADOR_UNICO" ? "var(--verde-suave)" : "#fff",
                cursor: "pointer",
              }}
            >
              <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 3 }}>
                🎪 Organizador único
              </b>
              <span className="texto-fraco" style={{ fontSize: 12.5 }}>
                Festas, quermesses, formaturas, festivais e eventos de empresa/bairro — todos os
                quiosques recebem na mesma conta.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setModalidade("MULTI_ESTABELECIMENTO")}
              style={{
                textAlign: "left",
                padding: "14px 16px",
                borderRadius: 12,
                border: `2px solid ${modalidade === "MULTI_ESTABELECIMENTO" ? "var(--verde)" : "var(--linha)"}`,
                background: modalidade === "MULTI_ESTABELECIMENTO" ? "var(--verde-suave)" : "#fff",
                cursor: "pointer",
              }}
            >
              <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 3 }}>
                🍴 Estabelecimentos independentes
              </b>
              <span className="texto-fraco" style={{ fontSize: 12.5 }}>
                Feiras, exposições e festivais gastronômicos — cada participante conecta a própria
                conta Mercado Pago e recebe direto (split 1:1).
              </span>
            </button>
          </div>
          <p className="texto-fraco" style={{ fontSize: 11.5, marginTop: 8 }}>
            Só define o padrão ao criar um quiosque neste evento — dá pra ajustar por quiosque
            depois, se precisar misturar os dois modelos.
          </p>
        </div>
      )}

      <div className="campo">
        <label>Nome do evento</label>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </div>

      <div className="campo">
        <label>Local</label>
        <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} />
      </div>

      <div className="campo">
        <label>Data e hora</label>
        <input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <div className="campo">
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={temGeofencing}
            onChange={(e) => setTemGeofencing(e.target.checked)}
          />
          Definir raio de geofencing (fora do raio, cliente não consegue pedir)
        </label>
      </div>

      {temGeofencing && (
        <>
          <div className="campo">
            <label>Raio de pedidos (metros)</label>
            <input
              type="number"
              min={1}
              value={raio}
              onChange={(e) => setRaio(e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Latitude</label>
            <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          </div>

          <div className="campo">
            <label>Longitude</label>
            <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>

          <button
            type="button"
            className="btn btn-secundario btn-bloco"
            style={{ marginBottom: 14 }}
            disabled={buscandoLocalizacao}
            onClick={usarLocalizacaoAtual}
          >
            {buscandoLocalizacao ? "Obtendo localização…" : "Usar minha localização atual"}
          </button>
        </>
      )}

      {erro && (
        <div className="aviso" style={{ marginBottom: 10 }}>
          {erro}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primario btn-bloco"
        disabled={enviando}
        onClick={salvar}
      >
        {enviando ? "Salvando…" : eventoInicial ? "Salvar alterações" : "Criar evento"}
      </button>
    </div>
  );
}
