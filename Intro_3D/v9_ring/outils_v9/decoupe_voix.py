# Découpage d une prise vocale aux silences (énergie par tranches de 10 ms).
import subprocess,sys,numpy as np
def charge(f,sr=44100):
    b=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(sr),'-f','f32le','-'],capture_output=True).stdout
    return np.frombuffer(b,np.float32)
def segments(x,sr=44100,seuil_db=-38,min_sil=0.22):
    h=int(sr*0.01); n=len(x)//h; e=np.sqrt(np.mean(x[:n*h].reshape(n,h)**2,1)+1e-12); db=20*np.log10(e)
    ref=np.percentile(db,95); on=db>ref+seuil_db-(-0)  # relatif
    on=db>(ref-30)
    segs=[];i=0
    while i<n:
        if on[i]:
            j=i
            while j<n:
                k=j
                while k<n and not on[k]: k+=1
                if k>=n: break
                if (k-j)*0.01>=min_sil and not on[j]: break
                j=k+1 if k==j else k
                while j<n and on[j]: j+=1
            segs.append((i*0.01,j*0.01)); i=j
        i+=1
    return segs
if __name__=='__main__':
    for f in sys.argv[1:]:
        x=charge(f); s=segments(x)
        print(f, len(x)/44100, [(round(a,2),round(b,2)) for a,b in s])
