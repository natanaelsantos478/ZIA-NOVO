import React from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { type ProposalData, formatFieldValue } from '../../lib/proposalFieldEngine';
import { Loader2 } from 'lucide-react';

// ---- TYPES ----

// These types are inferred from TemplateCanvas but redefined here for clarity
// in a real app, they should be shared from a common types file
type BlockType = 'logo' | 'text' | 'field' | 'table' | 'divider' | 'two-columns' | 'signature';

interface BlockConfig {
  fontSize?: number;
  bold?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  prefix?: string;
  suffix?: string;
  tableColumns?: string[];
  columnABinding?: string;
  columnBBinding?: string;
  staticText?: string;
}

interface Block {
  id: string;
  type: BlockType;
  label: string;
  binding?: string;
  config: BlockConfig;
}

interface Section {
  id: string;
  label: string;
  blocks: Block[];
}

interface Template {
  id: string;
  name: string;
  sections: Section[];
}

interface ProposalPDFProps {
  template: Template;
  proposalData: ProposalData;
  resolvedFields: Record<string, string>;
  resolvedNumeric: Record<string, number>;
}

// ---- STYLES ----

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  section: {
    marginBottom: 20,
  },
  // Table styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    flex: 1,
  },
  tableTotals: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    marginTop: 2,
  },
  // Block styles
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    marginVertical: 10,
    width: '100%',
  },
  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  column: {
    flex: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fieldLabel: {
    width: '40%',
    color: '#64748b',
  },
  fieldValue: {
    width: '60%',
    color: '#0f172a',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    width: 200,
    marginTop: 40,
    marginBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
});

// ---- RENDERERS ----

const RenderBlock = ({ block, props }: { block: Block, props: ProposalPDFProps }) => {
  const { proposalData, resolvedFields } = props;
  const { config } = block;

  const textStyle = {
    fontSize: config.fontSize || 10,
    fontWeight: config.bold ? 'bold' as const : 'normal',
    color: config.color || '#334155',
    textAlign: config.align || 'left',
  };

  switch (block.type) {
    case 'logo':
      const alignItems = config.align === 'center' ? 'center' : config.align === 'right' ? 'flex-end' : 'flex-start';
      return (
        <View style={{ marginBottom: 20, alignItems }}>
          <View style={{
            backgroundColor: '#4f46e5',
            width: 40,
            height: 40,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 5
          }}>
             <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>ZIA</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e293b' }}>ZIA CRM</Text>
        </View>
      );

    case 'text':
      return (
        <Text style={[textStyle, { marginBottom: 10 }]}>
          {config.staticText || ''}
        </Text>
      );

    case 'field':
      const value = block.binding ? (resolvedFields[block.binding] || '-') : '-';
      const displayText = `${config.prefix || ''}${value}${config.suffix || ''}`;

      // If simple alignment, just text
      if (config.align) {
        return <Text style={[textStyle, { marginBottom: 5 }]}>{displayText}</Text>;
      }

      // Default label-value layout
      return (
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { fontSize: config.fontSize || 10 }]}>{block.label}:</Text>
          <Text style={[styles.fieldValue, textStyle]}>{displayText}</Text>
        </View>
      );

    case 'divider':
      return <View style={styles.divider} />;

    case 'two-columns':
      const valA = config.columnABinding ? (resolvedFields[config.columnABinding] || '') : '';
      const valB = config.columnBBinding ? (resolvedFields[config.columnBBinding] || '') : '';

      // Helper to split multiline content (like addresses) if needed,
      // but for now simple text mapping. Ideally bindings could point to objects.

      return (
        <View style={styles.twoColumns}>
          <View style={styles.column}>
             <Text style={{ fontWeight: 'bold', marginBottom: 4, color: '#64748b', fontSize: 8 }}>EMPRESA</Text>
             <Text>{valA || proposalData.company.name}</Text>
             <Text>{proposalData.company.address}</Text>
             <Text>{proposalData.company.email}</Text>
          </View>
          <View style={styles.column}>
             <Text style={{ fontWeight: 'bold', marginBottom: 4, color: '#64748b', fontSize: 8 }}>CLIENTE</Text>
             <Text>{valB || proposalData.client.name}</Text>
             <Text>{proposalData.client.company}</Text>
             <Text>{proposalData.client.email}</Text>
          </View>
        </View>
      );

    case 'table':
      const cols = config.tableColumns || ['description', 'qty', 'price', 'total'];

      return (
        <View style={{ marginVertical: 10 }}>
          {/* Header */}
          <View style={styles.tableHeader}>
            {cols.includes('description') && <Text style={{ flex: 3 }}>Descrição</Text>}
            {cols.includes('qty') && <Text style={styles.tableCell}>Qtd</Text>}
            {cols.includes('price') && <Text style={styles.tableCell}>Preço Unit.</Text>}
            {cols.includes('discount') && <Text style={styles.tableCell}>Desc.</Text>}
            {cols.includes('total') && <Text style={[styles.tableCell, { textAlign: 'right' }]}>Subtotal</Text>}
          </View>

          {/* Rows */}
          {proposalData.items.map((item, idx) => {
            const subtotal = item.qty * item.price;
            return (
              <View key={item.id} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                {cols.includes('description') && <Text style={{ flex: 3 }}>{item.description}</Text>}
                {cols.includes('qty') && <Text style={styles.tableCell}>{item.qty}</Text>}
                {cols.includes('price') && <Text style={styles.tableCell}>{formatFieldValue(item.price, 'currency')}</Text>}
                {cols.includes('discount') && <Text style={styles.tableCell}>{item.discount ? `${item.discount}%` : '-'}</Text>}
                {cols.includes('total') && <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatFieldValue(subtotal, 'currency')}</Text>}
              </View>
            );
          })}

          {/* Table Footer (Hardcoded Logic for demo) */}
          <View style={styles.tableTotals}>
             <Text style={{ flex: 3 }}>Totais</Text>
             <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                {resolvedFields['items_subtotal'] || '-'}
             </Text>
          </View>
        </View>
      );

    case 'signature':
      return (
        <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
           <View>
              <View style={styles.signatureLine} />
              <Text>Assinatura Responsável</Text>
           </View>
           <Text>Data: _____/_____/__________</Text>
        </View>
      );

    default:
      return null;
  }
};

// ---- MAIN DOCUMENT ----

export const ProposalPDFDocument = (props: ProposalPDFProps) => (
  <Document title={`Orçamento - ${props.proposalData.client.name}`} author="ZIA CRM">
    <Page size="A4" style={styles.page}>
      {props.template.sections.map((section) => (
        <View key={section.id} style={styles.section}>
          {section.blocks.map((block) => (
            <RenderBlock key={block.id} block={block} props={props} />
          ))}
        </View>
      ))}

      <View style={styles.footer} fixed>
        <Text>Gerado por ZIA CRM em {new Date().toLocaleDateString('pt-BR')}</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  </Document>
);

// ---- DOWNLOAD BUTTON ----

export const DownloadPDFButton = ({ document, fileName, disabled }: { document: any, fileName: string, disabled?: boolean }) => {
  if (disabled) {
    return (
      <button disabled className="px-4 py-2 bg-slate-200 text-slate-400 rounded-lg font-bold text-sm cursor-not-allowed flex items-center">
        Exportar PDF
      </button>
    );
  }

  return (
    <PDFDownloadLink document={document} fileName={fileName}>
      {({ loading }) => (
        <button
          disabled={loading}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md font-bold text-sm flex items-center transition-all disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {loading ? 'Gerando PDF...' : 'Baixar PDF'}
        </button>
      )}
    </PDFDownloadLink>
  );
};
