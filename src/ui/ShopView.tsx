"use client";
// Der Laden (M5a): kaufen bei Sibel. Kein Feilschen, keine Mengen – ein Tipp pro Dose.
import {
  isCareful,
  paletteIndex,
  shopOffers,
  type GameContent,
  type GameState,
  type Action,
} from "@/engine";
import { rgbCss } from "./paint";

const GROUPS = [
  { kind: "color", title: "Farben" },
  { kind: "marker", title: "Marker" },
  { kind: "cap", title: "Caps" },
  { kind: "dose", title: "Druck" },
] as const;

export function ShopView(props: {
  content: GameContent;
  state: GameState;
  onBuy: (action: Action) => void;
  onClose: () => void;
}) {
  const { content, state } = props;
  const eco = content.economy!;
  const offers = shopOffers(state, content);
  const careful = isCareful(state, content);

  return (
    <div className="overlay blackbook shop">
      <div className="bb-head">
        <span className="bb-title">{eco.texts.shop_title}</span>
        <span className="shop-money">{state.money} €</span>
        <button className="small-btn" onPointerUp={props.onClose}>
          Zu
        </button>
      </div>
      {careful && <p className="shop-careful">{eco.careful_text}</p>}
      <div className="bb-list">
        {offers.length === 0 && <p className="shop-careful">{eco.texts.shop_empty}</p>}
        {GROUPS.map((g) => {
          const rows = offers.filter((o) => o.item.kind === g.kind);
          if (rows.length === 0) return null;
          return (
            <div key={g.kind}>
              <p className="bag-group">{g.title}</p>
              {rows.map((o) => (
                <div key={o.item.id} className="bb-entry shop-entry">
                  <span className="bb-entry-title">
                    {o.item.color && (
                      <i className="bag-swatch" style={{ background: rgbCss(paletteIndex(o.item.color))}} />
                    )}
                    {o.item.name}
                    {o.owned > 0 ? ` ×${o.owned}` : ""}
                  </span>
                  <p>{o.item.text}</p>
                  <button
                    className="small-btn shop-buy"
                    disabled={!o.affordable}
                    onPointerUp={() => o.affordable && props.onBuy({ type: "BUY", item: o.item.id })}
                  >
                    {o.price} €
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
