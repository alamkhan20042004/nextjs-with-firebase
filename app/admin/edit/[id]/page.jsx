"use client";
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ADMIN_EMAILS } from '@/lib/config';

export default function EditCoursePage(){
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id;
  const [user,setUser] = useState(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [notFound,setNotFound] = useState(false);
  const [error,setError] = useState("");
  const [fields,setFields] = useState(Array(2000).fill(""));
  const [form,setForm] = useState({
    courseName:"",
    gumroadLink:"",
    imageUrl:"",
    visibility:"show",
    sectionControl:[10]
  });
  const [showFields,setShowFields] = useState(false);
  const [progress,setProgress] = useState({edited:0,total:2000});

  // Auth gate
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth,u=>{
      if(!u){ router.push('/login'); return; }
      if(!ADMIN_EMAILS.includes(u.email||'')){ router.push('/user'); return; }
      setUser(u); setLoading(false);
    });
    return ()=>unsub();
  },[router]);

  const load = useCallback(async()=>{
    if(!courseId) return;
    try {
      const ref = doc(db,'adminContent',courseId);
      const snap = await getDoc(ref);
      if(!snap.exists()){ setNotFound(true); return; }
      const data = snap.data();
      setForm({
        courseName: data.courseName||"",
        gumroadLink: data.gumroadLink||"",
        imageUrl: data.imageUrl||"",
        visibility: data.visibility||"show",
        sectionControl: Array.isArray(data.sectionControl)&&data.sectionControl.length>0 ? data.sectionControl : [10]
      });
      const f = Array.isArray(data.fields)? [...data.fields] : [];
      while(f.length < 2000) f.push("");
      setFields(f);
    } catch(e){
      console.error(e); setError('Failed to load course');
    }
  },[courseId]);

  useEffect(()=>{ if(user) load(); },[user,load]);

  const handleFieldChange = (i,val)=>{
    setFields(prev=>{
      const copy=[...prev]; copy[i]=val; return copy;
    });
    setProgress(p=>({ ...p, edited: p.edited+1 }));
  };

  const handleSCChange = (idx,val)=>{
    setForm(prev=>{
      const sc=[...prev.sectionControl]; sc[idx]=parseInt(val)||0; return {...prev, sectionControl: sc };
    });
  };
  const addSection=()=> setForm(prev=>({...prev, sectionControl:[...prev.sectionControl,10]}));
  const removeSection=(idx)=> setForm(prev=>{ if(prev.sectionControl.length<=1) return prev; const sc=[...prev.sectionControl]; sc.splice(idx,1); return {...prev, sectionControl: sc };});

  const save=async()=>{
    setSaving(true); setError("");
    try {
      const ref=doc(db,'adminContent',courseId);
      const trimmed=fields.slice(0,2000);
      await updateDoc(ref,{
        courseName: form.courseName,
        gumroadLink: form.gumroadLink,
        imageUrl: form.imageUrl,
        visibility: form.visibility,
        sectionControl: form.sectionControl,
        fields: trimmed,
        updatedAt: serverTimestamp()
      });
      router.push('/admin');
    } catch(e){
      console.error(e); setError('Save failed');
    } finally { setSaving(false); }
  };

  if(loading) return <div className='min-h-screen flex items-center justify-center text-white'>Loading...</div>;
  if(notFound) return <div className='min-h-screen flex flex-col items-center justify-center text-white gap-4'>Course not found<button onClick={()=>router.push('/admin')} className='px-4 py-2 bg-gray-700 rounded'>Back</button></div>;

  return (
    <div className='min-h-screen bg-black text-white p-4 md:p-8'>
      <div className='max-w-7xl mx-auto'>
        <div className='flex flex-wrap gap-4 items-center justify-between mb-8'>
          <h1 className='text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-purple-500'>Edit Course</h1>
          <div className='flex gap-3'>
            <button onClick={()=>router.push('/admin')} className='px-4 py-2 bg-gray-800 rounded hover:bg-gray-700'>Back</button>
            <button disabled={saving} onClick={save} className={`px-5 py-2 rounded font-semibold ${saving?'bg-indigo-800':'bg-indigo-600 hover:bg-indigo-700'} transition`}>{saving?'Saving...':'Save All'}</button>
          </div>
        </div>
        {error && <div className='mb-4 p-3 rounded bg-red-700/50 border border-red-500 text-sm'>{error}</div>}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='space-y-6 lg:col-span-1'>
            <div>
              <label className='block text-sm font-medium mb-1'>Course Name</label>
              <input value={form.courseName} onChange={e=>setForm(f=>({...f,courseName:e.target.value}))} className='w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-600' />
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>Gumroad Link</label>
              <input value={form.gumroadLink} onChange={e=>setForm(f=>({...f,gumroadLink:e.target.value}))} className='w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-600' />
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>Image URL</label>
              <input value={form.imageUrl} onChange={e=>setForm(f=>({...f,imageUrl:e.target.value}))} className='w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-600' />
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>Visibility</label>
              <select value={form.visibility} onChange={e=>setForm(f=>({...f,visibility:e.target.value}))} className='w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-600'>
                <option value='show'>Show</option>
                <option value='hide'>Hide</option>
              </select>
            </div>
            <div className='p-4 bg-gray-850/60 border border-gray-700 rounded'>
              <div className='flex justify-between items-center mb-2'>
                <h4 className='text-sm font-semibold text-gray-200'>Section Control</h4>
                <button onClick={addSection} className='px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs'>Add</button>
              </div>
              <p className='text-[11px] text-gray-400 mb-3'>Numbers define how many fields belong to each section.</p>
              <div className='space-y-2 max-h-48 overflow-y-auto pr-1'>
                {form.sectionControl.map((c,idx)=>(
                  <div key={idx} className='flex items-center gap-2'>
                    <span className='text-xs text-gray-400 w-16'>S{idx+1}</span>
                    <input type='number' min='1' value={c} onChange={e=>handleSCChange(idx,e.target.value)} className='w-20 bg-gray-800 border border-gray-700 rounded p-1 text-xs' />
                    {form.sectionControl.length>1 && <button onClick={()=>removeSection(idx)} className='text-red-400 hover:text-red-300 text-xs'>Remove</button>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <button onClick={()=>setShowFields(s=>!s)} className='w-full px-4 py-2 rounded bg-indigo-700 hover:bg-indigo-600 text-sm font-medium flex items-center justify-center gap-2'>
                {showFields? 'Hide Fields':'Show / Edit 2000 Fields'}
              </button>
              <div className='mt-2 text-[11px] text-gray-500'>Edited count: {progress.edited}</div>
            </div>
          </div>
          <div className='lg:col-span-2'>
            {showFields && (
              <div className='max-h-[75vh] overflow-y-auto border border-gray-800 rounded-lg p-4 bg-gray-850/40'>
                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'>
                  {fields.map((val,i)=>(
                    <div key={i} className='space-y-1'>
                      <label className='block text-[10px] font-medium text-gray-400'>Field {i+1}</label>
                      <input value={val} onChange={e=>handleFieldChange(i,e.target.value)} className='w-full bg-gray-800 border border-gray-700 rounded p-2 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-600' placeholder={`Field ${i+1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
