import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Search, Plus, MapPin, Users, Pencil, Trash2, X, ChevronLeft, ChevronRight, SlidersHorizontal, Map, LayoutGrid, RefreshCw, AlertCircle, CheckCircle2, Building2, ExternalLink } from 'lucide-react'
import './style.css'

const API = '/api/v1'
const districts = [
  ['AVIA','Авиастроительный'],['VAH','Вахитовский'],['KIR','Кировский'],
  ['MOS','Московский'],['NSAV','Ново-Савиновский'],['PRIV','Приволжский'],['SOV','Советский']
]
const emptyForm = {name:'',city:'Казань',district_code:'VAH',street:'',house:'',formatted_address:'',latitude:'',longitude:'',capacity:'100',description:''}
async function request(path, options={}) {
  const res = await fetch(`${API}${path}`, {headers:{'Content-Type':'application/json',...(options.headers||{})},...options})
  if (res.status === 204) return null
  const data = await res.json().catch(()=>null)
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Ошибка HTTP ${res.status}`)
    err.code = data?.error?.code
    err.details = data?.error?.details
    err.status = res.status
    throw err
  }
  return data
}
function App(){
  const [venues,setVenues]=useState([])
  const [meta,setMeta]=useState({page:1,page_size:25,total:0})
  const [page,setPage]=useState(1)
  const [query,setQuery]=useState('')
  const [district,setDistrict]=useState('')
  const [coords,setCoords]=useState('')
  const [sort,setSort]=useState('name')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [modal,setModal]=useState(false)
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState(emptyForm)
  const [saving,setSaving]=useState(false)
  const [deleting,setDeleting]=useState(null)
  const [view,setView]=useState('table')

  async function load(p=page){
    setLoading(true); setError('')
    const params=new URLSearchParams({page:String(p),page_size:'25',sort})
    if(query.trim()) params.set('q',query.trim())
    if(district) params.set('district_code',district)
    if(coords) params.set('has_coordinates',coords)
    try{
      const result=await request(`/venues?${params}`)
      setVenues(result.data||[]); setMeta(result.meta||{page:p,page_size:25,total:0})
    }catch(e){setError(e.message);setVenues([])}
    finally{setLoading(false)}
  }
  useEffect(()=>{load(page)},[page,query,district,coords,sort])
  const pages=Math.max(1,Math.ceil(meta.total/25))
  const totalCapacity=useMemo(()=>venues.reduce((s,v)=>s+(v.capacity||0),0),[venues])
  function openCreate(){setEditing(null);setForm(emptyForm);setModal(true)}
  function openEdit(v){setEditing(v);setForm({name:v.name,city:v.city||'Казань',district_code:v.district_code,street:v.street,house:v.house,formatted_address:v.formatted_address,latitude:v.latitude??'',longitude:v.longitude??'',capacity:String(v.capacity),description:v.description||''});setModal(true)}
  function setField(k,v){setForm(f=>({...f,[k]:v}))}
  async function save(e){
    e.preventDefault(); setSaving(true);setError('')
    if((form.latitude==='') !== (form.longitude==='')){setError('Укажите обе координаты или оставьте оба поля пустыми.');setSaving(false);return}
    const body={name:form.name.trim(),city:'Казань',district_code:form.district_code,street:form.street.trim(),house:form.house.trim(),formatted_address:form.formatted_address.trim(),capacity:Number(form.capacity),latitude:form.latitude===''?null:Number(form.latitude),longitude:form.longitude===''?null:Number(form.longitude),description:form.description.trim()||null}
    try{
      if(editing) await request(`/venues/${editing.id}`,{method:'PATCH',body:JSON.stringify(body)})
      else await request('/venues',{method:'POST',body:JSON.stringify(body)})
      setModal(false);setNotice(editing?'Изменения сохранены':'Площадка добавлена');setTimeout(()=>setNotice(''),3500);load()
    }catch(e){setError(humanError(e))}
    finally{setSaving(false)}
  }
  async function remove(v){
    if(!confirm(`Удалить площадку «${v.name}»? Действие необратимо.`))return
    setDeleting(v.id);setError('')
    try{await request(`/venues/${v.id}`,{method:'DELETE'});setNotice('Площадка удалена');setTimeout(()=>setNotice(''),3500);load()}
    catch(e){setError(humanError(e))}
    finally{setDeleting(null)}
  }
  function humanError(e){
    if(e.code==='RESOURCE_IN_USE')return 'Площадка используется мероприятиями. Удаление невозможно, пока существуют связанные события.'
    if(e.code==='CAPACITY_BELOW_QUOTA')return 'Вместимость нельзя уменьшить ниже квоты одного из связанных мероприятий.'
    if(e.code==='INVALID_COORDINATES')return 'Координаты должны быть указаны парой: широта и долгота.'
    if(e.code==='INVALID_DISTRICT')return 'Выбран неизвестный район. Обновите страницу и повторите попытку.'
    return e.message
  }
  const formatNum=n=>new Intl.NumberFormat('ru-RU').format(n||0)
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><MapPin size={20}/></div><div><b>Казанские события</b><span>Панель управления</span></div></div>
      <div className="nav-caption">УПРАВЛЕНИЕ</div>
      <div className="nav-item active"><Building2 size={18}/>Площадки <span className="nav-count">{meta.total}</span></div>
      <div className="sidebar-bottom"><div className="api-status"><span className="status-dot"/> API подключён через Docker</div><div className="sidebar-foot">Справочник площадок<br/>Казань · Вариант 7</div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb">Справочники <span>/</span> <b>Площадки</b></div><div className="top-right"><span className="city-pill"><MapPin size={14}/> Казань</span><div className="avatar">К</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">КАТАЛОГ ОБЪЕКТОВ</div><h1>Площадки</h1><p>Управление площадками, адресами и вместимостью мероприятий</p></div><button className="primary" onClick={openCreate}><Plus size={18}/> Добавить площадку</button></div>
        <div className="stats">
          <div className="stat-card"><div className="stat-icon purple"><Building2 size={19}/></div><div><span>Всего площадок</span><strong>{formatNum(meta.total)}</strong></div><small>в справочнике</small></div>
          <div className="stat-card"><div className="stat-icon blue"><Users size={19}/></div><div><span>Вместимость на странице</span><strong>{formatNum(totalCapacity)}</strong></div><small>посещений одновременно</small></div>
          <div className="stat-card"><div className="stat-icon green"><Map size={19}/></div><div><span>С координатами</span><strong>{venues.filter(v=>v.latitude!=null&&v.longitude!=null).length}</strong></div><small>на текущей странице</small></div>
        </div>
        {notice&&<div className="notice"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
        {error&&<div className="error-banner"><AlertCircle size={18}/><span>{error}</span><button onClick={()=>setError('')}><X size={16}/></button></div>}
        <section className="catalog">
          <div className="catalog-head"><div><h2>Список площадок</h2><span>{formatNum(meta.total)} записей в каталоге</span></div><div className="view-toggle"><button className={view==='table'?'selected':''} onClick={()=>setView('table')} title="Таблица"><LayoutGrid size={17}/></button><button className={view==='cards'?'selected':''} onClick={()=>setView('cards')} title="Карточки"><SlidersHorizontal size={17}/></button></div></div>
          <div className="filters"><div className="search"><Search size={18}/><input placeholder="Поиск по названию и описанию..." value={query} onChange={e=>{setPage(1);setQuery(e.target.value)}}/></div><select value={district} onChange={e=>{setPage(1);setDistrict(e.target.value)}}><option value="">Все районы</option>{districts.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select><select value={coords} onChange={e=>{setPage(1);setCoords(e.target.value)}}><option value="">Любые координаты</option><option value="true">С координатами</option><option value="false">Без координат</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">По названию</option><option value="-capacity">По вместимости ↓</option><option value="capacity">По вместимости ↑</option></select><button className="refresh" onClick={()=>load()} title="Обновить"><RefreshCw size={17}/></button></div>
          {loading?<div className="loading"><span className="spinner"/>Загружаем площадки...</div>:venues.length===0?<div className="empty"><div className="empty-icon"><Building2 size={26}/></div><h3>Площадки не найдены</h3><p>Измените параметры поиска или добавьте новую площадку.</p><button className="primary" onClick={openCreate}><Plus size={17}/> Добавить площадку</button></div>:view==='table'?<div className="table-wrap"><table><thead><tr><th>ПЛОЩАДКА</th><th>АДРЕС</th><th>РАЙОН</th><th>ВМЕСТИМОСТЬ</th><th>КООРДИНАТЫ</th><th></th></tr></thead><tbody>{venues.map(v=><tr key={v.id}><td><div className="venue-name"><div className="venue-avatar"><Building2 size={17}/></div><div><b>{v.name}</b><small>{v.city||'Казань'}</small></div></div></td><td><div className="address">{v.formatted_address||`${v.street}, ${v.house}`}</div></td><td><span className="district-tag">{districts.find(d=>d[0]===v.district_code)?.[1]||v.district_code}</span></td><td><b className="capacity">{formatNum(v.capacity)}</b><span className="muted"> чел.</span></td><td>{v.latitude!=null&&v.longitude!=null?<a className="coords" href={`https://www.openstreetmap.org/?mlat=${v.latitude}&mlon=${v.longitude}#map=17/${v.latitude}/${v.longitude}`} target="_blank" rel="noreferrer">{Number(v.latitude).toFixed(4)}, {Number(v.longitude).toFixed(4)} <ExternalLink size={12}/></a>:<span className="no-coords">Не указаны</span>}</td><td><div className="actions"><button onClick={()=>openEdit(v)} title="Редактировать"><Pencil size={16}/></button><button className="danger" disabled={deleting===v.id} onClick={()=>remove(v)} title="Удалить"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>:<div className="cards">{venues.map(v=><article className="venue-card" key={v.id}><div className="venue-card-top"><div className="venue-avatar"><Building2 size={18}/></div><span className="district-tag">{districts.find(d=>d[0]===v.district_code)?.[1]||v.district_code}</span></div><h3>{v.name}</h3><p><MapPin size={14}/>{v.formatted_address}</p><div className="card-capacity"><Users size={16}/><b>{formatNum(v.capacity)}</b> мест</div><div className="card-actions"><button onClick={()=>openEdit(v)}><Pencil size={15}/> Изменить</button><button className="danger" onClick={()=>remove(v)}><Trash2 size={15}/> Удалить</button></div></article>)}</div>}
          {venues.length>0&&<div className="pagination"><span>Показано {(page-1)*25+1}–{Math.min(page*25,meta.total)} из {meta.total}</span><div><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={17}/></button><span className="page-number">{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={17}/></button></div></div>}
        </section>
        <footer>Казанские события <span>·</span> Справочник площадок <span>·</span> API v1</footer>
      </div>
    </main>
    {modal&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><div className="modal"><div className="modal-head"><div><div className="eyebrow">{editing?'ИЗМЕНЕНИЕ ЗАПИСИ':'НОВАЯ ЗАПИСЬ'}</div><h2>{editing?'Редактировать площадку':'Добавить площадку'}</h2></div><button className="close" onClick={()=>setModal(false)}><X size={20}/></button></div><form onSubmit={save}><div className="form-grid"><label className="full">Название площадки *<input required maxLength="200" value={form.name} onChange={e=>setField('name',e.target.value)} placeholder="Например, Концертный зал"/></label><label>Район *<select required value={form.district_code} onChange={e=>setField('district_code',e.target.value)}>{districts.map(([c,n])=><option value={c} key={c}>{n}</option>)}</select></label><label>Город<input value="Казань" disabled/></label><label>Улица *<input required value={form.street} onChange={e=>setField('street',e.target.value)} placeholder="ул. Баумана"/></label><label>Дом *<input required value={form.house} onChange={e=>setField('house',e.target.value)} placeholder="д. 1"/></label><label className="full">Полный адрес *<input required value={form.formatted_address} onChange={e=>setField('formatted_address',e.target.value)} placeholder="Казань, ул. Баумана, 1"/></label><label>Широта (WGS84)<input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={e=>setField('latitude',e.target.value)} placeholder="55.7961"/></label><label>Долгота (WGS84)<input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={e=>setField('longitude',e.target.value)} placeholder="49.1064"/></label><label>Вместимость, чел. *<input required type="number" min="1" step="1" value={form.capacity} onChange={e=>setField('capacity',e.target.value)}/></label><label className="full">Описание<textarea rows="3" value={form.description} onChange={e=>setField('description',e.target.value)} placeholder="Дополнительная информация о площадке"/></label></div><div className="form-hint"><MapPin size={15}/> Координаты можно не указывать, но для карты нужна пара широта + долгота.</div>{error&&<div className="form-error"><AlertCircle size={16}/>{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(false)}>Отмена</button><button type="submit" className="primary" disabled={saving}>{saving?'Сохранение...':editing?'Сохранить изменения':'Создать площадку'}</button></div></form></div></div>}
  </div>
}
createRoot(document.getElementById('root')).render(<App/>)
