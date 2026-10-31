# Placement de la voix off V8 : découpe les prises voix_off/L01..L14.mp3 aux silences et écrit data/voix_v8.json (à lancer depuis Intro_3D/v8_finale).
import json,sys
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__))); from decoupe_voix import charge, segments
plan=json.load(open('data/plan_v8.json'))
MS={'L10':0.12,'L11':0.1}
S={f'L{i:02d}':segments(charge(f'voix_off/L{i:02d}.mp3'),min_sil=MS.get(f'L{i:02d}',0.22)) for i in range(1,15)}
assert len(S['L04'])==15 and len(S['L10'])==6 and len(S['L11'])==3 and len(S['L09'])==2 and len(S['L14'])==2
P=[]
def piece(i,L,segs,t,texte):
    a=S[L][segs[0]][0]; b=S[L][segs[-1]][1]
    P.append({'id':i,'fichier':f'voix_off/{L}.mp3','src_debut':round(max(0,a-0.01),3),'src_fin':round(b+0.02,3),'t_film':round(t,3),'fin_film':round(t+b-a+0.03,3),'texte':texte})
piece('salon_accueil','L01',[0],1.2,'Mesdames et messieurs… bienvenue dans le salon le plus festif de France !')
piece('salon_arene','L02',[0],7.7,'Mais ce soir… le salon se transforme… en ARÈNE !  (« arène » ≈ 10,9 s, sur la plongée)')
piece('ecuries_intro','L03',[0],12.05,'Place aux quinze écuries !')
for k,e in enumerate(plan['ecuries']): piece(f'ecurie_{k+1:02d}','L04',[k],e['debut']+0.12,e['nom']+' !')
piece('paris_telephone','L05',[0],59.6,'Et maintenant, à vous de jouer ! Sortez vos téléphones… qui va gagner ?')
piece('paris_carnet','L06',[0],65.8,"Pas de téléphone ? Pas de panique : on parie au carnet, à l'ancienne !")
piece('meute','L07',[0],70.35,"Cinq voies… et c'est parti !")
piece('caisses','L08',[0],74.25,"Les caisses mystères s'ouvrent !")
piece('boss','L09',[0],76.45,'Attention… les boss débarquent !')
piece('batmobile','L09',[1],79.05,'Et… la Batmobile !')
for i,p in enumerate(plan['pieges']):
    piece('piege_'+p['rig'],'L10',[i],p['contact_film']-0.4,['La bascule !','La pelote !',"L'obus !",'Le curling !','Le boulet !','Le bowling !'][i])
piece('regle_41','L11',[0],89.02,'Quarante et un millimètres…')
piece('regle_sinon','L11',[1],90.59,'sinon :')
piece('regle_ejection','L11',[2],91.14,"éjection !  (sur l'éjection, 91,2 s)")
piece('sprint','L12',[0],93.3,'Dernier sprint ! Tout le monde fonce vers la ligne…')
d=S['L13'][0][1]-S['L13'][0][0]; piece('photo_finish','L13',[0],101.1-d,"… et c'est la photo-finish !")
piece('final_titre','L14',[0],102.65,'Le Grand Prix de Noël… le vingt-trois décembre…')
piece('final_paris','L14',[1],102.65+S['L14'][0][1]-S['L14'][0][0]+0.15,'À vos paris !')
P.sort(key=lambda p:p['t_film'])
for a,b in zip(P,P[1:]): assert b['t_film']>=a['fin_film']+0.04,(a['id'],a['fin_film'],b['id'],b['t_film'])
assert P[-1]['fin_film']<107.0, P[-1]
json.dump({'voix':"ElevenLabs « Commentateur def » (voix clonée d'Esteban, eleven_v4), 31 oct. 2026",'voice_id':'QLs7iK8pmd23CyW29R9f','pieces':P},open('data/voix_v8.json','w'),ensure_ascii=False,indent=1)
for p in P: print(f"{p['t_film']:7.2f}-{p['fin_film']:7.2f} {p['id']}")
