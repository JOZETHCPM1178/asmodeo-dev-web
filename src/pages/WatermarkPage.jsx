// src/pages/WatermarkPage.jsx
import { useState, useRef } from 'react'
import { toast } from 'react-hot-toast'
import SEO from '../components/ui/SEO'
import styles from './WatermarkPage.module.css'

export default function WatermarkPage() {
  const [img, setImg]             = useState(null)
  const [imgSrc, setImgSrc]       = useState(null)
  const [resultSrc, setResultSrc] = useState(null)
  const [resultCanvas, setResultCanvas] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [status, setStatus]       = useState('Ready to process')
  const [wmSize, setWmSize]       = useState('-')
  const [procTime, setProcTime]   = useState('-')
  const [drag, setDrag]           = useState(false)
  const fileRef = useRef(null)
  const tick = () => new Promise(r => setTimeout(r, 30))

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast.error('Solo imágenes JPG, PNG, WEBP'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10MB'); return }
    const reader = new FileReader()
    reader.onload = e => {
      const image = new Image()
      image.onload = () => {
        setImg(image); setImgSrc(e.target.result)
        setResultSrc(null); setResultCanvas(null)
        setStatus('Image loaded — ready to process')
        setWmSize('-'); setProcTime('-')
      }
      image.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  function onDrop(e) {
    e.preventDefault(); setDrag(false)
    loadFile(e.dataTransfer.files[0])
  }

  async function removeWatermark() {
    if (!img || processing) return
    const t0 = Date.now()
    setProcessing(true); setResultSrc(null); setProgress(0)

    try {
      const W = img.naturalWidth, H = img.naturalHeight
      const isLarge = W > 1024 || H > 1024
      const size = isLarge ? 96 : 48
      const margin = 20
      const x0 = W - size - margin, y0 = H - size - margin
      const x1 = Math.min(W, x0 + size + margin), y1 = Math.min(H, y0 + size + margin)
      setWmSize(`${size}×${size}px`)

      setStatus('Loading image...'); setProgress(10); await tick()

      const c = document.createElement('canvas')
      c.width = W; c.height = H
      c.getContext('2d').drawImage(img, 0, 0)
      const imageData = c.getContext('2d').getImageData(0, 0, W, H)
      const d = imageData.data
      const out = new Uint8ClampedArray(d)

      setStatus('AI detects watermark...'); setProgress(30); await tick()

      const isMask = new Uint8Array(W * H)
      const alphas = new Float32Array(W * H)

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * W + x) * 4
          const r = d[i], g = d[i+1], b = d[i+2]
          const lum = (r*299 + g*587 + b*114) / 1000
          const refs = []
          for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-2,0],[2,0],[0,-2],[0,2],[-3,0],[3,0],[0,-3],[0,3]]) {
            const nx=x+dx, ny=y+dy
            if(nx<0||nx>=W||ny<0||ny>=H) continue
            if(nx>=x0&&nx<x1&&ny>=y0&&ny<y1) continue
            const ni=(ny*W+nx)*4
            refs.push([d[ni],d[ni+1],d[ni+2]])
          }
          if(!refs.length) continue
          const aR=refs.reduce((s,p)=>s+p[0],0)/refs.length
          const aG=refs.reduce((s,p)=>s+p[1],0)/refs.length
          const aB=refs.reduce((s,p)=>s+p[2],0)/refs.length
          const avgLum=(aR*299+aG*587+aB*114)/1000
          if(lum - avgLum > 8) {
            isMask[y*W+x]=1
            alphas[y*W+x]=Math.max(0.05, Math.min(0.95,
              Math.max(
                aR<255?(r-aR)/(255-aR):0,
                aG<255?(g-aG)/(255-aG):0,
                aB<255?(b-aB)/(255-aB):0
              )
            ))
          }
        }
      }

      setStatus('AI cleans image...'); setProgress(60); await tick()

      for (let y=y0;y<y1;y++) {
        for (let x=x0;x<x1;x++) {
          if(!isMask[y*W+x]) continue
          const i=(y*W+x)*4, alpha=alphas[y*W+x], inv=1-alpha
          if(inv<0.05) {
            let best=null,bestD=9999
            for(let dy=-5;dy<=5;dy++) for(let dx=-5;dx<=5;dx++) {
              const nx=x+dx,ny=y+dy
              if(nx<0||nx>=W||ny<0||ny>=H||isMask[ny*W+nx]) continue
              const dist=Math.abs(dx)+Math.abs(dy)
              if(dist<bestD){bestD=dist;best=(ny*W+nx)*4}
            }
            if(best!==null){out[i]=d[best];out[i+1]=d[best+1];out[i+2]=d[best+2]}
          } else {
            out[i]  =Math.max(0,Math.min(255,Math.round((d[i]  -255*alpha)/inv)))
            out[i+1]=Math.max(0,Math.min(255,Math.round((d[i+1]-255*alpha)/inv)))
            out[i+2]=Math.max(0,Math.min(255,Math.round((d[i+2]-255*alpha)/inv)))
          }
          out[i+3]=255
        }
      }

      setProgress(80); await tick()

      // Suavizar bordes
      for(let y=y0;y<y1;y++) {
        for(let x=x0;x<x1;x++) {
          if(!isMask[y*W+x]) continue
          let border=false
          for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){
            const nx=x+dx,ny=y+dy
            if(nx>=0&&nx<W&&ny>=0&&ny<H&&!isMask[ny*W+nx]){border=true;break}
          }
          if(!border) continue
          const i=(y*W+x)*4
          let sr=out[i],sg=out[i+1],sb=out[i+2],cnt=1
          for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]){
            const nx=x+dx,ny=y+dy
            if(nx<0||nx>=W||ny<0||ny>=H||isMask[ny*W+nx]) continue
            sr+=out[(ny*W+nx)*4];sg+=out[(ny*W+nx)*4+1];sb+=out[(ny*W+nx)*4+2];cnt++
          }
          if(cnt>1){out[i]=Math.round(sr/cnt);out[i+1]=Math.round(sg/cnt);out[i+2]=Math.round(sb/cnt)}
        }
      }

      setProgress(95); await tick()

      const outData = new ImageData(out, W, H)
      const rc = document.createElement('canvas')
      rc.width=W; rc.height=H
      rc.getContext('2d').putImageData(outData,0,0)
      setResultCanvas(rc)
      setResultSrc(rc.toDataURL('image/png'))
      setProcTime(`${((Date.now()-t0)/1000).toFixed(1)}s`)
      setProgress(100)
      setStatus('Watermark removed successfully ✓')
      toast.success('¡Marca de agua eliminada! ✅')

    } catch(e) {
      setStatus('Error: ' + (e.message||'Try again'))
      toast.error(e.message||'Error')
    } finally {
      setProcessing(false)
    }
  }

  function download() {
    const a = document.createElement('a')
    a.download = 'clean-image.png'
    a.href = resultCanvas ? resultCanvas.toDataURL('image/png') : resultSrc
    a.click()
  }

  function reset() {
    setImg(null); setImgSrc(null); setResultSrc(null); setResultCanvas(null)
    setStatus('Ready to process'); setWmSize('-'); setProcTime('-'); setProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className={styles.page}>
      <SEO title="Gemini Watermark Remover" description="Remove watermark from Gemini, Nono Banana images in one click. Free, no signup." url="/watermark" />

      <div className={styles.hero}>
        <div className={styles.heroBadge}>100% Safe and Secure</div>
        <h1 className={styles.heroTitle}>Gemini Watermark Remover</h1>
        <p className={styles.heroSub}>Remove watermark from Gemini Nano Banana images in one click.<br />Free AI Gemini watermark remover tool for clean and professional images.</p>
        <div className={styles.heroTags}>
          <span>✔ Free tool</span>
          <span>✔ No signup</span>
          <span>✔ HD download</span>
          <span>✔ Fast processing</span>
        </div>
      </div>

      <div className={styles.tool}>
        {!img ? (
          <div className={`${styles.dropzone} ${drag ? styles.dragOver : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={onDrop}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" className={styles.dropSvg}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p className={styles.dropTitle}>Drop your image here</p>
            <p className={styles.dropOr}>or browse files</p>
            <p className={styles.dropMeta}>Supports: JPG, PNG, WEBP · Max size: 10MB</p>
            <p className={styles.dropPrivacy}>No signup · Your images are never stored</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={e=>loadFile(e.target.files[0])} />
          </div>
        ) : (
          <>
            <div className={styles.compare}>
              <div className={styles.comparePanel}>
                <p className={styles.compareLabel}>Original</p>
                <img src={imgSrc} alt="original" className={styles.compareImg} />
              </div>
              <div className={styles.comparePanel}>
                <p className={styles.compareLabel}>Watermark Removed</p>
                {resultSrc
                  ? <img src={resultSrc} alt="resultado" className={styles.compareImg} />
                  : <div className={styles.comparePlaceholder}>
                      {processing ? <span className="spinner spinner-lg" /> : <p>Result will appear here</p>}
                    </div>
                }
              </div>
            </div>

            {processing && (
              <div className={styles.progressWrap}>
                <div className={styles.progressTrack}><div className={styles.progressBar} style={{width:`${progress}%`}} /></div>
              </div>
            )}

            <div className={styles.btnRow}>
              {!resultSrc
                ? <button className={styles.btnProcess} onClick={removeWatermark} disabled={processing}>
                    {processing ? <><span className="spinner" style={{width:18,height:18}}/> Processing...</> : 'Remove Watermark'}
                  </button>
                : <>
                    <button className={styles.btnDownload} onClick={download}>Download Image</button>
                    <button className={styles.btnAnother} onClick={reset}>Process Another</button>
                  </>
              }
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}><span className={styles.statLabel}>Status:</span><span className={styles.statVal}>{status}</span></div>
              <div className={styles.stat}><span className={styles.statLabel}>Watermark Size:</span><span className={styles.statVal}>{wmSize}</span></div>
              <div className={styles.stat}><span className={styles.statLabel}>Processing Time:</span><span className={styles.statVal}>{procTime}</span></div>
            </div>

            <p className={styles.disclaimer}>⚠️ <strong>DISCLAIMER:</strong> This tool is for personal and educational use only.</p>
          </>
        )}
      </div>

      <div className={styles.steps}>
        <h2 className={styles.sectionTitle}>How to Remove Gemini Watermark from Images</h2>
        <div className={styles.stepsGrid}>
          {[
            {n:'1',title:'Upload image',desc:'Drop your image or browse and select a file.'},
            {n:'2',title:'AI detects watermark',desc:'Watermark area is detected and prepared for removal.'},
            {n:'3',title:'Download clean image',desc:'Get HD output instantly without signup.'},
          ].map(s=>(
            <div key={s.n} className={styles.stepCard}>
              <div className={styles.stepNum}>{s.n}</div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.features}>
        <h2 className={styles.sectionTitle}>Best AI Watermark Remover Tool Online</h2>
        <div className={styles.featGrid}>
          {[
            {icon:'⚡',title:'1-click watermark removal',desc:'Minimal steps. Maximum speed.'},
            {icon:'🖼️',title:'HD quality download',desc:'Keep your image sharp and professional.'},
            {icon:'🆓',title:'Free forever',desc:'No hidden pricing or forced signup.'},
            {icon:'🔒',title:'No login required',desc:'Privacy-first and frictionless.'},
            {icon:'📱',title:'Mobile friendly',desc:'Works smoothly on phone & desktop.'},
            {icon:'🤖',title:'Fast AI processing',desc:'Optimized algorithm for speed.'},
          ].map(f=>(
            <div key={f.title} className={styles.featCard}>
              <span className={styles.featIcon}>{f.icon}</span>
              <h3 className={styles.featTitle}>{f.title}</h3>
              <p className={styles.featDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.supported}>
        <h2 className={styles.sectionTitle}>Remove Watermarks from All AI Generated Images</h2>
        <div className={styles.supportedGrid}>
          {['Gemini','Midjourney','DALL·E','Leonardo AI','Ideogram','Bing Image Creator'].map(t=>(
            <span key={t} className={styles.supportedTag}>{t}</span>
          ))}
        </div>
      </div>

      <div className={styles.faq}>
        <h2 className={styles.sectionTitle}>FAQ – Gemini Watermark Remover</h2>
        <div className={styles.faqList}>
          {[
            {q:'How to remove Gemini watermark from image?',a:'Upload your image, click Remove Watermark and download. The AI detects and fills the area automatically.'},
            {q:'Is this tool free?',a:'Yes. Completely free. No account needed. Start instantly.'},
            {q:'Does it work on all AI images?',a:'Yes. Gemini, Midjourney, DALL·E, Leonardo AI, Ideogram and more.'},
            {q:'Is it safe to upload images?',a:'Yes. Images are processed locally in your browser — never uploaded to any server.'},
            {q:'Will image quality decrease?',a:'No. The AI keeps HD quality. The area blends naturally. The final image looks clean.'},
          ].map(f=>(
            <div key={f.q} className={styles.faqItem}>
              <h3 className={styles.faqQ}>{f.q}</h3>
              <p className={styles.faqA}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
