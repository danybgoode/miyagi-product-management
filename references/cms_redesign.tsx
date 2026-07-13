import React, { useState } from 'react';
import { 
  Search, 
  Menu, 
  Ticket, 
  BookOpen, 
  Download, 
  Users, 
  Star, 
  FileText, 
  Gift, 
  Megaphone, 
  ShieldCheck, 
  Store, 
  Flag, 
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Filter
} from 'lucide-react';

// Mock data structured logically by Page/Section instead of a flat list of keys
const cmsData = {
  pages: [
    {
      id: 'about',
      title: 'Acerca (Plataforma)',
      path: '/acerca',
      fields: [
        {
          key: 'page.eyebrow',
          label: 'Texto superior (Eyebrow)',
          original: 'Acerca de',
          es: 'Acerca de',
          en: 'About'
        },
        {
          key: 'page.lead',
          label: 'Párrafo Principal',
          original: 'Un marketplace nativo para agentes, hecho para México. No nos creas: pregúntale a tu propia IA.',
          es: 'Un marketplace nativo para agentes, hecho para México. No nos creas: pregúntale a tu propia IA.',
          en: 'An agent-native marketplace for Mexico. Don\'t take our word for it — ask your own AI.',
          type: 'textarea'
        },
        {
          key: 'page.metaDescription',
          label: 'Meta Descripción (SEO)',
          original: 'Qué es miyagisanchez.com, por qué vender, cómo empezar y cuánto cuesta. Marketplace nativo para agentes, hecho para México. 0% de comisión.',
          es: 'Qué es miyagisanchez.com, por qué vender, cómo empezar y cuánto cuesta. Marketplace nativo para agentes, hecho para México. 0% de comisión.',
          en: 'What is miyagisanchez.com, why sell, how to start and how much it costs. Agent-native marketplace, made for Mexico. 0% commission.',
          type: 'textarea'
        }
      ]
    }
  ],
  components: [
    {
      id: 'email-events',
      title: 'Correos de Eventos',
      path: 'Plantillas de Email',
      fields: [
        {
          key: 'email.date',
          label: 'Etiqueta de Fecha',
          original: 'Fecha',
          es: 'Fecha',
          en: 'Date'
        },
        {
          key: 'email.downloadTicketQr',
          label: 'Botón de Descarga QR',
          original: 'Descargar QR del boleto',
          es: 'Descargar QR del boleto',
          en: 'Download ticket QR'
        },
        {
          key: 'email.event',
          label: 'Etiqueta de Evento',
          original: 'Evento',
          es: 'Evento',
          en: 'Event'
        }
      ]
    }
  ]
};

const SidebarItem = ({ icon: Icon, label, active, onClick, hasSubItems }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-2.5 mb-1 rounded-lg text-sm font-medium transition-colors ${
      active 
        ? 'bg-emerald-50 text-emerald-800' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
      {label}
    </div>
    {hasSubItems && <ChevronRight className={`w-4 h-4 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />}
  </button>
);

const Sidebar = ({ activeSection, setActiveSection }) => {
  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 h-screen fixed left-0 top-0 overflow-y-auto flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Miyagi <span className="text-emerald-600">•</span> Sanchez</h1>
      </div>
      
      <nav className="flex-1 px-3 space-y-6">
        <div>
          <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">General</div>
          <SidebarItem icon={Ticket} label="Cupones" />
          <SidebarItem icon={BookOpen} label="Edición impresa" />
          <SidebarItem icon={Download} label="Importar oferta" />
          <SidebarItem icon={Users} label="Vecindario" />
          <SidebarItem icon={Star} label="Selección" />
        </div>

        <div>
          <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sitio Web</div>
          <SidebarItem 
            icon={FileText} 
            label="Contenido & Textos" 
            active={activeSection === 'content'} 
            onClick={() => setActiveSection('content')}
            hasSubItems
          />
          <SidebarItem icon={Gift} label="Referidos" />
          <SidebarItem icon={Megaphone} label="Promotores" />
        </div>

        <div>
          <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Administración</div>
          <SidebarItem icon={ShieldCheck} label="Auditoría" />
          <SidebarItem icon={Store} label="Tiendas" />
          <SidebarItem icon={Flag} label="Flags" />
          <SidebarItem icon={Globe} label="Scraping" />
        </div>
      </nav>
    </aside>
  );
};

const TranslationField = ({ field, onUpdate }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-base font-semibold text-slate-800">{field.label}</h4>
          <code className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded mt-1 inline-block">
            {field.key}
          </code>
        </div>
        {/* Status indicator (mocked as complete for demo) */}
        <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Traducido
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm text-slate-600 border border-slate-100">
        <span className="font-semibold text-slate-500 mr-2 text-xs uppercase">Original:</span>
        {field.original}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spanish Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Español (Base)</label>
          {field.type === 'textarea' ? (
            <textarea 
              className="w-full text-sm border-slate-200 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 min-h-[100px] p-3 border resize-y"
              defaultValue={field.es}
            />
          ) : (
            <input 
              type="text" 
              className="w-full text-sm border-slate-200 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2.5 border"
              defaultValue={field.es}
            />
          )}
        </div>

        {/* English Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">English</label>
          {field.type === 'textarea' ? (
            <textarea 
              className="w-full text-sm border-slate-200 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 min-h-[100px] p-3 border resize-y"
              defaultValue={field.en}
            />
          ) : (
            <input 
              type="text" 
              className="w-full text-sm border-slate-200 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2.5 border"
              defaultValue={field.en}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeSection, setActiveSection] = useState('content');
  const [activeGroup, setActiveGroup] = useState(cmsData.pages[0]); // Default to first page
  const [hasChanges, setHasChanges] = useState(true); // Mocked for demo

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

      <main className="flex-1 ml-64 flex flex-col h-screen">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shrink-0">
          <div className="flex-1 flex items-center">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar páginas, claves o texto..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
               <Filter className="w-4 h-4" /> Filtros
             </button>
             <div className="w-px h-6 bg-slate-200"></div>
             <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-200">
               MS
             </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* Sub-navigation for Pages/Components (The Information Architecture Fix) */}
          <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Gestor de Contenido</h2>
            </div>
            
            <div className="p-2">
              <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Páginas</div>
              {cmsData.pages.map(page => (
                <button
                  key={page.id}
                  onClick={() => setActiveGroup(page)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    activeGroup.id === page.id 
                      ? 'bg-emerald-50 text-emerald-700 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page.title}
                </button>
              ))}

              <div className="px-2 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Componentes / Emails</div>
              {cmsData.components.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => setActiveGroup(comp)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    activeGroup.id === comp.id 
                      ? 'bg-emerald-50 text-emerald-700 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {comp.title}
                </button>
              ))}
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 relative">
            
            <div className="max-w-4xl mx-auto">
              {/* Page Header */}
              <div className="mb-8">
                <div className="flex items-center text-sm text-slate-500 mb-2">
                  <span>Contenido</span>
                  <ChevronRight className="w-4 h-4 mx-1" />
                  <span>{activeGroup.path || 'Página'}</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900">{activeGroup.title}</h1>
                <p className="text-slate-500 mt-1">
                  Editando {activeGroup.fields.length} campos de texto para esta sección.
                </p>
              </div>

              {/* Status Filters (Moved here for context) */}
              <div className="flex gap-2 mb-6">
                <button className="px-4 py-1.5 rounded-full bg-slate-800 text-white text-sm font-medium shadow-sm">
                  Todos ({activeGroup.fields.length})
                </button>
                <button className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                  Sin traducir (0)
                </button>
              </div>

              {/* Fields List */}
              <div className="space-y-6 pb-24">
                {activeGroup.fields.map(field => (
                  <TranslationField key={field.key} field={field} />
                ))}
              </div>
            </div>

            {/* Floating Action Bar for Saving - Eliminates repetitive buttons */}
            {hasChanges && (
              <div className="fixed bottom-8 left-[calc(50%+8rem)] -translate-x-1/2 bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Cambios sin guardar</span>
                  <span className="text-xs text-slate-300">Tienes modificaciones en esta página.</span>
                </div>
                <button className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}