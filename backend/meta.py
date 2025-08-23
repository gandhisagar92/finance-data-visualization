from typing import Any, Dict


class Meta:
    @staticmethod
    def mapping() -> Dict[str, Any]:
        return {
            "referenceDataTypes": [
                {
                    "type": "Stock",
                    "display": "Stock",
                    "queryBy": [
                        {"type": "InstrumentId", "inputs": [{"id": "InstrumentId", "label": "Instrument ID", "kind": "text"}]},
                        {"type": "ISIN", "inputs": [{"id": "ISIN", "label": "ISIN", "kind": "text"}]},
                        {"type": "TradingLineId", "inputs": [{"id": "TradingLineId", "label": "Trading Line ID", "kind": "text"}]},
                        {"type": "PostTradeId", "inputs": [{"id": "PostTradeId", "label": "Post Trade ID", "kind": "text"}]},
                        {"type": "RIC", "inputs": [{"id": "RIC", "label": "RIC", "kind": "text"}]},
                        {"type": "BloombergTicker", "inputs": [{"id": "BloombergTicker", "label": "Bloomberg Ticker", "kind": "text"}]},
                    ],
                },
                {
                    "type": "Option",
                    "display": "Option",
                    "queryBy": [
                        {"type": "InstrumentId", "inputs": [{"id": "InstrumentId", "label": "Instrument ID", "kind": "text"}]},
                        {"type": "RIC", "inputs": [{"id": "RIC", "label": "RIC", "kind": "text"}]},
                        {"type": "TradingLineId", "inputs": [{"id": "TradingLineId", "label": "Trading Line ID", "kind": "text"}]},
                        {"type": "OCCSymbol", "inputs": [{"id": "OCCSymbol", "label": "OCC Symbol", "kind": "text"}]},
                        {"type": "PostTradeId", "inputs": [{"id": "PostTradeId", "label": "Post Trade ID", "kind": "text"}]},
                        {"type": "ISIN", "inputs": [{"id": "ISIN", "label": "ISIN", "kind": "text"}]},
                        {"type": "BloombergTicker", "inputs": [{"id": "BloombergTicker", "label": "Bloomberg Ticker", "kind": "text"}]},
                        {"type": "UnderlyingTradingLineId", "inputs": [{"id": "UnderlyingTradingLineId", "label": "Underlying Trading Line ID", "kind": "text"}]},
                        {"type": "UnderlyingInstrumentId", "inputs": [{"id": "UnderlyingInstrumentId", "label": "Underlying Instrument ID", "kind": "text"}]},
                        {
                            "type": "Economics",
                            "inputs": [
                                {"id": "UnderlyingId", "label": "Underlying (InstrumentId or TradingLineId)", "kind": "text"},
                                {"id": "Strike", "label": "Strike Price", "kind": "number"},
                                {"id": "ContractSize", "label": "Contract Size", "kind": "number"},
                                {"id": "ExpirationDate", "label": "Expiration Date", "kind": "date"},
                                {"id": "CallOrPut", "label": "Call or Put", "kind": "select", "options": ["Call", "Put"]},
                            ],
                        },
                    ],
                },
                {
                    "type": "Future",
                    "display": "Future",
                    "queryBy": [
                        {"type": "InstrumentId", "inputs": [{"id": "InstrumentId", "label": "Instrument ID", "kind": "text"}]},
                        {"type": "RIC", "inputs": [{"id": "RIC", "label": "RIC", "kind": "text"}]},
                        {"type": "TradingLineId", "inputs": [{"id": "TradingLineId", "label": "Trading Line ID", "kind": "text"}]},
                        {"type": "OCCSymbol", "inputs": [{"id": "OCCSymbol", "label": "OCC Symbol", "kind": "text"}]},
                        {"type": "PostTradeId", "inputs": [{"id": "PostTradeId", "label": "Post Trade ID", "kind": "text"}]},
                        {"type": "ISIN", "inputs": [{"id": "ISIN", "label": "ISIN", "kind": "text"}]},
                        {"type": "BloombergTicker", "inputs": [{"id": "BloombergTicker", "label": "Bloomberg Ticker", "kind": "text"}]},
                        {"type": "UnderlyingTradingLineId", "inputs": [{"id": "UnderlyingTradingLineId", "label": "Underlying Trading Line ID", "kind": "text"}]},
                        {"type": "UnderlyingInstrumentId", "inputs": [{"id": "UnderlyingInstrumentId", "label": "Underlying Instrument ID", "kind": "text"}]},
                        {
                            "type": "Economics",
                            "inputs": [
                                {"id": "UnderlyingId", "label": "Underlying (InstrumentId or TradingLineId)", "kind": "text"},
                                {"id": "Strike", "label": "Strike Price", "kind": "number"},
                                {"id": "ContractSize", "label": "Contract Size", "kind": "number"},
                                {"id": "ExpirationDate", "label": "Expiration Date", "kind": "date"},
                                {"id": "CallOrPut", "label": "Call or Put", "kind": "select", "options": ["Call", "Put"]},
                            ],
                        },
                    ],
                },
                {
                    "type": "Index",
                    "display": "Index",
                    "queryBy": [
                        {"type": "InstrumentId", "inputs": [{"id": "InstrumentId", "label": "Instrument ID", "kind": "text"}]},
                        {"type": "ISIN", "inputs": [{"id": "ISIN", "label": "ISIN", "kind": "text"}]},
                        {"type": "TradingLineId", "inputs": [{"id": "TradingLineId", "label": "Trading Line ID", "kind": "text"}]},
                        {"type": "PostTradeId", "inputs": [{"id": "PostTradeId", "label": "Post Trade ID", "kind": "text"}]},
                        {"type": "RIC", "inputs": [{"id": "RIC", "label": "RIC", "kind": "text"}]},
                        {"type": "BloombergTicker", "inputs": [{"id": "BloombergTicker", "label": "Bloomberg Ticker", "kind": "text"}]},
                    ],
                },
            ],
            "graphConfig": {
                "NODE_WIDTH": 190,
                "NODE_HEIGHT": 84,
                "ATTR_WIDTH": 100,
                "ATTR_HEIGHT": 28,
                "LEVEL_SPACING_MIN": 280,
                "LEVEL_SPACING_MAX": 520,
                "VERTICAL_SPACING_MIN": 150,
                "VERTICAL_SPACING_MAX": 260,
                "ATTR_OFFSET_Y": -50,
                "ATTR_SPACING_X": 32,
                "MIN_ZOOM": 0.1,
                "MAX_ZOOM": 3,
                "ZOOM_STEP": 0.1
            },
            "uiConfig": {
                "LEFT_WIDTH": 350,
                "TOP_HEIGHT": 300
            },
            "styleConfig": {
                "nodeTitleFontPx": 11,
                "nodeLabelFontPx": 10,
                "edgeLabelFontPx": 10,
                "attrKeyFontPx": 10,
                "attrValFontPx": 10,
                "tooltipFontPx": 10
            }
        }

