// Curated "Futbol Efsaneleri" — 598 retired players, clubs in chronological
// order. See legends.ts for the format. Isolated from the API sync on purpose.
export const LEGENDS_RAW = `
#Türkiye
Lefter Küçükandonyadis=Taksim SK, Fenerbahçe, Fiorentina, Nice, Fenerbahçe
Metin Oktay=İzmirspor, Galatasaray, Palermo, Galatasaray
Can Bartu=Fenerbahçe, Fiorentina, Venezia, Lazio, Fenerbahçe
Cemil Turan=İstanbulspor, Fenerbahçe
Tanju Çolak=Samsunspor, Galatasaray, Fenerbahçe
Rıdvan Dilmen=Muğlaspor, Denizlispor, Sarıyer, Fenerbahçe
Şenol Güneş (KL)=Trabzonspor
Fatih Terim=Adana Demirspor, Galatasaray
Oğuz Çetin=Sakaryaspor, Fenerbahçe, İstanbulspor
Rüştü Reçber (KL)=Antalyaspor, Fenerbahçe, Barcelona, Fenerbahçe, Beşiktaş
Bülent Korkmaz=Galatasaray
Ogün Temizkanoğlu=Trabzonspor, Fenerbahçe
Alpay Özalan=Altay, Fenerbahçe, Aston Villa, Incheon United, 1. FC Köln
Tugay Kerimoğlu=Galatasaray, Rangers, Blackburn Rovers
Hakan Şükür=Sakaryaspor, Bursaspor, Galatasaray, Torino, Galatasaray, Inter, Parma, Blackburn Rovers, Galatasaray
Hakan Ünsal=Karabükspor, Galatasaray, Blackburn Rovers, Galatasaray
Ergün Penbe=Gaziantepspor, Galatasaray, Ankaraspor
Ümit Davala=Galatasaray, Milan, Inter (kiralık), Werder Bremen
Okan Buruk=Galatasaray, Inter, Beşiktaş, Galatasaray, İstanbul Başakşehir
Hasan Şaş=Ankaragücü, Galatasaray
Emre Belözoğlu=Galatasaray, Inter, Newcastle United, Fenerbahçe, Atlético Madrid, Fenerbahçe, İstanbul Başakşehir, Fenerbahçe
Nihat Kahveci=Beşiktaş, Real Sociedad, Villarreal, Beşiktaş
İlhan Mansız=Gençlerbirliği, Samsunspor, Beşiktaş, Vissel Kobe
Tümer Metin=Kocaelispor, Beşiktaş, Fenerbahçe, Larissa, Ankaragücü
Gökdeniz Karadeniz=Trabzonspor, Rubin Kazan
Volkan Demirel (KL)=Kartalspor, Fenerbahçe
Ayhan Akman=Gaziantepspor, Beşiktaş, Galatasaray
Arda Turan=Galatasaray, Atlético Madrid, Barcelona, İstanbul Başakşehir (kiralık), Galatasaray
Burak Yılmaz=Antalyaspor, Beşiktaş, Manisaspor, Fenerbahçe, Eskişehirspor, Trabzonspor, Galatasaray, Beijing Guoan, Trabzonspor, Beşiktaş, Lille, Fortuna Sittard
Mehmet Topal=Dardanelspor, Galatasaray, Valencia, Fenerbahçe, İstanbul Başakşehir

#Brezilya
Pelé=Santos, New York Cosmos
Garrincha=Botafogo, Corinthians, Atlético Junior (Kolombiya), Flamengo, Olaria
Didi=Madureira, Fluminense, Botafogo, Real Madrid, Botafogo, Sporting Cristal, Veracruz, São Paulo
Vavá=Vasco da Gama, Atlético Madrid, Palmeiras, América (Meksika), San Diego Toros
Nílton Santos=Botafogo
Djalma Santos=Portuguesa, Palmeiras, Atlético Paranaense
Mário Zagallo=Flamengo, Botafogo
Carlos Alberto Torres=Fluminense, Santos, Fluminense, Flamengo, New York Cosmos, California Surf, New York Cosmos
Gérson=Flamengo, Botafogo, São Paulo, Fluminense
Tostão=Cruzeiro, Vasco da Gama
Jairzinho=Botafogo, Marsilya, Cruzeiro, Portuguesa (Venezuela), Noroeste, Fast Clube, Jorge Wilstermann
Rivelino=Corinthians, Fluminense, Al-Hilal
Falcão=Internacional, Roma, São Paulo
Sócrates=Botafogo-SP, Corinthians, Fiorentina, Flamengo, Santos, Botafogo-SP
Zico=Flamengo, Udinese, Flamengo, Kashima Antlers
Careca=Guarani, São Paulo, Napoli, Kashiwa Reysol, Santos
Júnior=Flamengo, Torino, Pescara, Flamengo
Leandro=Flamengo
Toninho Cerezo=Atlético Mineiro, Roma, Sampdoria, São Paulo, Cruzeiro
Branco=Internacional, Fluminense, Brescia, Porto, Genoa, Grêmio, Fluminense, Corinthians, Middlesbrough, MetroStars
Cláudio Taffarel (KL)=Internacional, Parma, Reggiana, Atlético Mineiro, Galatasaray, Parma
Jorginho=Flamengo, Bayer Leverkusen, Bayern Münih, Kashima Antlers, São Paulo, Vasco da Gama, Fluminense
Aldair=Flamengo, Benfica, Roma, Genoa, Murata (San Marino)
Bebeto=Vitória, Flamengo, Vasco da Gama, Deportivo La Coruña, Flamengo, Sevilla, Cruzeiro, Botafogo, Toros Neza, Kashima Antlers, Vasco da Gama
Romário=Vasco da Gama, PSV, Barcelona, Flamengo, Valencia, Flamengo, Vasco da Gama, Fluminense, Vasco da Gama, Miami FC, Adelaide United, Vasco da Gama, América-RJ
Ronaldo Nazário=Cruzeiro, PSV, Barcelona, Inter, Real Madrid, Milan, Corinthians
Rivaldo=Santa Cruz, Mogi Mirim, Corinthians (kiralık), Palmeiras, Deportivo La Coruña, Barcelona, Milan, Cruzeiro, Olympiakos, AEK, Bunyodkor, São Paulo, Kabuscorp, São Caetano, Mogi Mirim
Roberto Carlos=União São João, Palmeiras, Inter, Real Madrid, Fenerbahçe, Corinthians, Anzhi Makhachkala, Delhi Dynamos
Cafu=São Paulo, Real Zaragoza, Palmeiras, Roma, Milan
Dunga=Internacional, Corinthians, Santos, Vasco da Gama, Pisa, Fiorentina, Pescara, Stuttgart, Júbilo Iwata, Internacional
Mauro Silva=Guarani, Bragantino, Deportivo La Coruña
Dida (KL)=Vitória, Cruzeiro, Milan, Corinthians (kiralık), Milan, Portuguesa, Grêmio, Internacional
Lúcio=Internacional, Bayer Leverkusen, Bayern Münih, Inter, Juventus, São Paulo, Palmeiras, FC Goa, Gama
Juninho Pernambucano=Sport Recife, Vasco da Gama, Lyon, Al-Gharafa, Vasco da Gama, New York Red Bulls, Vasco da Gama
Juninho Paulista=Ituano, São Paulo, Middlesbrough, Atlético Madrid, Middlesbrough (kiralık), Vasco da Gama (kiralık), Middlesbrough, Celtic, Palmeiras, Flamengo, Sydney FC, Ituano
Gilberto Silva=América Mineiro, Atlético Mineiro, Arsenal, Panathinaikos, Grêmio, Atlético Mineiro
Emerson=Grêmio, Bayer Leverkusen, Roma, Juventus, Real Madrid, Milan, Santos
Zé Roberto=Portuguesa, Real Madrid, Flamengo, Bayer Leverkusen, Bayern Münih, Santos, Bayern Münih, Hamburg, Al-Gharafa, Grêmio, Palmeiras
Kaká=São Paulo, Milan, Real Madrid, Milan, São Paulo (kiralık), Orlando City
Ronaldinho=Grêmio, PSG, Barcelona, Milan, Flamengo, Atlético Mineiro, Querétaro, Fluminense
Adriano=Flamengo, Inter, Fiorentina (kiralık), Parma, Inter, São Paulo (kiralık), Flamengo, Roma, Corinthians, Atlético Paranaense, Miami United
Robinho=Santos, Real Madrid, Manchester City, Santos (kiralık), Milan, Santos (kiralık), Guangzhou Evergrande, Atlético Mineiro, Sivasspor, İstanbul Başakşehir
Maicon=Cruzeiro, Monaco, Inter, Manchester City, Roma, Avaí, Criciúma, Villa Nova, Sona
Júlio César (KL)=Flamengo, Inter, Queens Park Rangers, Toronto FC (kiralık), Benfica
Marcelo=Fluminense, Real Madrid, Olympiakos, Fluminense
Dani Alves=Bahia, Sevilla, Barcelona, Juventus, PSG, São Paulo, Barcelona, Pumas
Filipe Luís=Figueirense, Ajax, Deportivo La Coruña, Atlético Madrid, Chelsea, Atlético Madrid, Flamengo
Miranda=Coritiba, Sochaux, São Paulo, Atlético Madrid, Inter, Jiangsu Suning, São Paulo
Alex de Souza=Coritiba, Palmeiras, Flamengo (kiralık), Palmeiras, Cruzeiro, Fenerbahçe, Coritiba
Diego Ribas=Santos, Porto, Werder Bremen, Juventus, Wolfsburg, Atlético Madrid (kiralık), Wolfsburg, Fenerbahçe, Flamengo

#Arjantin
Alfredo Di Stéfano=River Plate, Huracán (kiralık), Millonarios, Real Madrid, Espanyol
Diego Maradona=Argentinos Juniors, Boca Juniors, Barcelona, Napoli, Sevilla, Newell's Old Boys, Boca Juniors
Omar Sívori=River Plate, Juventus, Napoli
Antonio Rattín=Boca Juniors
Mario Kempes=Instituto, Rosario Central, Valencia, River Plate, Valencia, Hércules, First Vienna, St. Pölten, Kremser, Fernández Vial, Pelita Jaya
Daniel Passarella=Sarmiento, River Plate, Fiorentina, Inter, River Plate
Ubaldo Fillol (KL)=Quilmes, Racing Club, River Plate, Flamengo, Atlético Madrid, Racing Club, Vélez Sarsfield
Osvaldo Ardiles=Instituto, Huracán, Tottenham, PSG (kiralık), Blackburn Rovers (kiralık), Queens Park Rangers, Fort Lauderdale Strikers, Swindon Town
Jorge Valdano=Newell's Old Boys, Alavés, Real Zaragoza, Real Madrid
Jorge Burruchaga=Independiente, Nantes, Valenciennes, Independiente
Claudio Caniggia=River Plate, Hellas Verona, Atalanta, Roma, Benfica, Boca Juniors, Atalanta, Dundee, Rangers, Qatar SC
Gabriel Batistuta=Newell's Old Boys, River Plate, Boca Juniors, Fiorentina, Roma, Inter (kiralık), Al-Arabi
Hernán Crespo=River Plate, Parma, Lazio, Inter, Chelsea, Milan (kiralık), Chelsea, Inter, Genoa, Parma
Juan Sebastián Verón=Estudiantes, Boca Juniors, Sampdoria, Parma, Lazio, Manchester United, Chelsea, Inter (kiralık), Estudiantes
Juan Román Riquelme=Boca Juniors, Barcelona, Villarreal, Boca Juniors, Argentinos Juniors
Pablo Aimar=River Plate, Valencia, Real Zaragoza, Benfica, Johor Darul Ta'zim, River Plate
Javier Saviola=River Plate, Barcelona, Monaco (kiralık), Sevilla (kiralık), Real Madrid, Benfica, Málaga, Olympiakos, Hellas Verona
Ariel Ortega=River Plate, Valencia, Sampdoria, Parma, River Plate, Fenerbahçe, Newell's Old Boys, River Plate, Independiente Rivadavia (kiralık), All Boys, Defensores de Belgrano
Juan Pablo Sorín=Argentinos Juniors, Juventus, River Plate, Cruzeiro, Lazio (kiralık), Barcelona (kiralık), PSG, Villarreal, Hamburg, Cruzeiro
Roberto Ayala=Ferro Carril Oeste, River Plate, Napoli, Milan, Valencia, Villarreal, Real Zaragoza, Racing Club
Walter Samuel=Newell's Old Boys, Boca Juniors, Roma, Real Madrid, Inter, Basel
Javier Zanetti=Talleres, Banfield, Inter
Esteban Cambiasso=Argentinos Juniors, Independiente, River Plate, Real Madrid, Inter, Leicester City, Olympiakos
Diego Milito=Racing Club, Genoa, Real Zaragoza, Genoa, Inter, Racing Club
Martín Palermo=Estudiantes, Boca Juniors, Villarreal, Real Betis, Alavés, Boca Juniors
Andrés D'Alessandro=River Plate, Wolfsburg, Portsmouth (kiralık), Real Zaragoza, San Lorenzo, Internacional, Nacional (kiralık), River Plate (kiralık), Internacional
Carlos Tévez=Boca Juniors, Corinthians, West Ham United, Manchester United, Manchester City, Juventus, Boca Juniors, Shanghai Shenhua, Boca Juniors
Sergio Agüero=Independiente, Atlético Madrid, Manchester City, Barcelona
Gonzalo Higuaín=River Plate, Real Madrid, Napoli, Juventus, Milan (kiralık), Chelsea (kiralık), Juventus, Inter Miami
Javier Mascherano=River Plate, Corinthians, West Ham United, Liverpool, Barcelona, Hebei China Fortune, Estudiantes
Maxi Rodríguez=Newell's Old Boys, Espanyol, Atlético Madrid, Liverpool, Newell's Old Boys, Peñarol, Newell's Old Boys
Ezequiel Lavezzi=Estudiantes (BA), San Lorenzo, Napoli, PSG, Hebei China Fortune
Fernando Gago=Boca Juniors, Real Madrid, Roma (kiralık), Valencia, Vélez Sarsfield (kiralık), Boca Juniors, Vélez Sarsfield
Martín Demichelis=River Plate, Bayern Münih, Málaga, Atlético Madrid, Málaga, Manchester City, Espanyol
Gabriel Heinze=Newell's Old Boys, Real Valladolid, Sporting Lizbon (kiralık), PSG, Manchester United, Real Madrid, Marseille, Roma, Newell's Old Boys

#İtalya
Dino Zoff (KL)=Udinese, Mantova, Napoli, Juventus
Gianni Rivera=Alessandria, Milan
Gigi Riva=Legnano, Cagliari
Giacinto Facchetti=Inter
Sandro Mazzola=Inter
Tarcisio Burgnich=Udinese, Juventus, Palermo, Inter, Napoli
Giancarlo Antognoni=Fiorentina, Lausanne
Paolo Rossi=Juventus, Como (kiralık), Vicenza, Perugia (kiralık), Juventus, Milan, Hellas Verona
Marco Tardelli=Pisa, Como, Juventus, Inter, St. Gallen
Antonio Cabrini=Cremonese, Atalanta, Juventus, Bologna
Claudio Gentile=Varese, Juventus, Fiorentina, Piacenza
Gaetano Scirea=Atalanta, Juventus
Bruno Conti=Roma, Genoa (kiralık), Roma
Alessandro Altobelli=Latina, Brescia, Inter, Juventus, Brescia
Gianluca Vialli=Cremonese, Sampdoria, Juventus, Chelsea
Roberto Mancini=Bologna, Sampdoria, Lazio, Leicester City
Roberto Donadoni=Atalanta, Milan, MetroStars, Milan, Al-Ittihad
Demetrio Albertini=Milan, Padova (kiralık), Milan, Atlético Madrid, Lazio, Atalanta, Barcelona
Alessandro Costacurta=Milan, Monza (kiralık), Milan
Franco Baresi=Milan
Paolo Maldini=Milan
Giuseppe Bergomi=Inter
Walter Zenga (KL)=Inter, Salernitana (kiralık), Savona (kiralık), Sambenedettese (kiralık), Inter, Sampdoria, Padova, New England Revolution
Giuseppe Signori=Leffe, Piacenza, Trento (kiralık), Foggia, Lazio, Sampdoria, Bologna, Sopron
Gianfranco Zola=Nuorese, Torres, Napoli, Parma, Chelsea, Cagliari
Fabrizio Ravanelli=Perugia, Avellino, Casertana, Reggiana, Juventus, Middlesbrough, Marseille, Lazio, Derby County, Dundee, Perugia
Roberto Baggio=Vicenza, Fiorentina, Juventus, Milan, Bologna, Inter, Brescia
Alessandro Del Piero=Padova, Juventus, Sydney FC, Delhi Dynamos
Francesco Totti=Roma
Christian Vieri=Torino, Pisa (kiralık), Ravenna, Venezia, Atalanta, Juventus, Atlético Madrid, Lazio, Inter, Milan, Monaco, Atalanta, Fiorentina, Atalanta
Filippo Inzaghi=Piacenza, Leffe (kiralık), Hellas Verona (kiralık), Piacenza, Parma, Atalanta, Juventus, Milan
Antonio Di Natale=Empoli, Iperzola (kiralık), Varese (kiralık), Viareggio (kiralık), Empoli, Udinese
Luca Toni=Modena, Empoli, Fiorenzuola, Lodigiani, Treviso, Vicenza, Brescia, Palermo, Fiorentina, Bayern Münih, Roma (kiralık), Genoa, Juventus, Al-Nasr, Fiorentina, Hellas Verona
Alessandro Nesta=Lazio, Milan, Montreal Impact, Chennaiyin
Fabio Cannavaro=Napoli, Parma, Inter, Juventus, Real Madrid, Juventus, Al-Ahli
Marco Materazzi=Marsala, Trapani, Perugia, Carpi (kiralık), Perugia, Everton, Perugia, Inter
Gennaro Gattuso=Perugia, Rangers, Salernitana, Milan, Sion
Andrea Pirlo=Brescia, Inter, Reggina (kiralık), Brescia (kiralık), Milan, Juventus, New York City
Daniele De Rossi=Roma, Boca Juniors
Fabio Grosso=Renato Curi Angolana, Chieti, Perugia, Palermo, Inter, Lyon, Juventus
Simone Perrotta=Reggina, Juventus, Bari, Chievo, Roma
Francesco Toldo (KL)=Hellas Verona, Trento, Ravenna, Fiorentina, Inter
Gianluigi Buffon (KL)=Parma, Juventus, PSG, Juventus, Parma
Giorgio Chiellini=Livorno, Fiorentina (kiralık), Juventus, Los Angeles FC
Leonardo Bonucci=Inter, Treviso (kiralık), Pisa (kiralık), Bari, Juventus, Milan, Juventus, Union Berlin, Fenerbahçe
Andrea Barzagli=Rondinella, Pistoiese, Ascoli, Palermo, Wolfsburg, Juventus
Fabio Quagliarella=Torino, Chieti (kiralık), Ascoli, Sampdoria, Udinese, Napoli, Juventus, Torino, Sampdoria
Mauro Camoranesi=Aldosivi, Santos Laguna, Banfield, Cruz Azul, Hellas Verona, Juventus, Stuttgart, Lanús, Racing Club

#Almanya
Fritz Walter=Kaiserslautern
Uwe Seeler=Hamburg
Franz Beckenbauer=Bayern Münih, New York Cosmos, Hamburg, New York Cosmos
Gerd Müller=1861 Nördlingen, Bayern Münih, Fort Lauderdale Strikers
Sepp Maier (KL)=Bayern Münih
Paul Breitner=Bayern Münih, Real Madrid, Eintracht Braunschweig, Bayern Münih
Wolfgang Overath=1. FC Köln
Günter Netzer=Borussia Mönchengladbach, Real Madrid, Grasshopper
Berti Vogts=Borussia Mönchengladbach
Karl-Heinz Rummenigge=Bayern Münih, Inter, Servette
Hans-Peter Briegel=Kaiserslautern, Hellas Verona, Sampdoria
Rudi Völler=Kickers Offenbach, 1860 München, Werder Bremen, Roma, Marseille, Bayer Leverkusen
Jürgen Klinsmann=Stuttgarter Kickers, Stuttgart, Inter, Monaco, Tottenham, Bayern Münih, Sampdoria, Tottenham
Lothar Matthäus=Borussia Mönchengladbach, Bayern Münih, Inter, Bayern Münih, MetroStars
Andreas Brehme=1. FC Saarbrücken, Kaiserslautern, Bayern Münih, Inter, Real Zaragoza, Kaiserslautern
Jürgen Kohler=Waldhof Mannheim, 1. FC Köln, Bayern Münih, Juventus, Borussia Dortmund
Matthias Sammer=Dynamo Dresden, Stuttgart, Inter, Borussia Dortmund
Thomas Häßler=1. FC Köln, Juventus, Roma, Karlsruher SC, Borussia Dortmund, 1860 München, Austria Salzburg
Stefan Effenberg=Borussia Mönchengladbach, Bayern Münih, Fiorentina, Borussia Mönchengladbach, Bayern Münih, Wolfsburg, Al-Arabi
Oliver Bierhoff=Bayer Uerdingen, Hamburg, Borussia Mönchengladbach, Austria Salzburg, Ascoli, Udinese, Milan, Monaco, Chievo
Oliver Kahn (KL)=Karlsruher SC, Bayern Münih
Jens Lehmann (KL)=Schalke 04, Milan, Borussia Dortmund, Arsenal, Stuttgart, Arsenal
Michael Ballack=Chemnitzer FC, Kaiserslautern, Bayer Leverkusen, Bayern Münih, Chelsea, Bayer Leverkusen
Bastian Schweinsteiger=Bayern Münih, Manchester United, Chicago Fire
Philipp Lahm=Bayern Münih, Stuttgart (kiralık), Bayern Münih
Torsten Frings=Alemannia Aachen, Werder Bremen, Borussia Dortmund, Bayern Münih, Werder Bremen, Toronto FC
Christoph Metzelder=Preußen Münster, Borussia Dortmund, Real Madrid, Schalke 04
Per Mertesacker=Hannover 96, Werder Bremen, Arsenal
Miroslav Klose=FC Homburg, Kaiserslautern, Werder Bremen, Bayern Münih, Lazio
Mario Gómez=Stuttgart, Bayern Münih, Fiorentina, Beşiktaş (kiralık), Wolfsburg, Stuttgart
Sami Khedira=Stuttgart, Real Madrid, Juventus, Hertha Berlin
Bernd Schneider=Carl Zeiss Jena, Eintracht Frankfurt, Bayer Leverkusen
Mesut Özil=Schalke 04, Werder Bremen, Real Madrid, Arsenal, Fenerbahçe, İstanbul Başakşehir
Toni Kroos=Bayern Münih, Bayer Leverkusen (kiralık), Real Madrid
Mats Hummels=Bayern Münih, Borussia Dortmund, Bayern Münih, Borussia Dortmund, Roma

#Fransa
Raymond Kopa=Angers, Reims, Real Madrid, Reims
Just Fontaine=USM Casablanca, Nice, Reims
Marius Trésor=Ajaccio, Marseille, Bordeaux
Michel Platini=Nancy, Saint-Étienne, Juventus
Alain Giresse=Bordeaux, Marseille
Jean Tigana=Toulon, Lyon, Bordeaux, Marseille
Luis Fernández=PSG, Matra Racing, Cannes
Jean-Pierre Papin=Valenciennes, Club Brugge, Marseille, Milan, Bayern Münih, Bordeaux, Guingamp
Eric Cantona=Auxerre, Martigues (kiralık), Marseille, Bordeaux (kiralık), Montpellier (kiralık), Marseille, Nîmes, Leeds United, Manchester United
Didier Deschamps=Nantes, Marseille, Bordeaux (kiralık), Marseille, Juventus, Chelsea, Valencia
Laurent Blanc=Montpellier, Napoli, Nîmes, Saint-Étienne, Auxerre, Barcelona, Marseille, Inter, Manchester United
Marcel Desailly=Nantes, Marseille, Milan, Chelsea, Al-Gharafa, Qatar SC
Lilian Thuram=Monaco, Parma, Juventus, Barcelona
Bixente Lizarazu=Bordeaux, Athletic Bilbao, Bayern Münih, Marseille, Bayern Münih
Fabien Barthez (KL)=Toulouse, Marseille, Monaco, Manchester United, Marseille, Nantes
Zinedine Zidane=Cannes, Bordeaux, Juventus, Real Madrid
Youri Djorkaeff=Grenoble, Strasbourg, Monaco, PSG, Inter, Kaiserslautern, Bolton Wanderers, Blackburn Rovers, MetroStars
Robert Pirès=Metz, Marseille, Arsenal, Villarreal, Aston Villa, FC Goa
Thierry Henry=Monaco, Juventus, Arsenal, Barcelona, New York Red Bulls, Arsenal (kiralık), New York Red Bulls
David Trezeguet=Platense, Monaco, Juventus, Hércules, Baniyas, River Plate, Newell's Old Boys, Pune City
Patrick Vieira=Cannes, Milan, Arsenal, Juventus, Inter, Manchester City
Claude Makélélé=Nantes, Marseille, Celta Vigo, Real Madrid, Chelsea, PSG
Emmanuel Petit=Monaco, Arsenal, Barcelona, Chelsea
Nicolas Anelka=PSG, Arsenal, Real Madrid, PSG, Liverpool (kiralık), Manchester City, Fenerbahçe, Bolton Wanderers, Chelsea, Shanghai Shenhua, Juventus (kiralık), West Bromwich Albion, Mumbai City
Franck Ribéry=Boulogne, Alès, Brest, Metz, Galatasaray, Marseille, Bayern Münih, Fiorentina, Salernitana
Florent Malouda=Châteauroux, Guingamp, Lyon, Chelsea, Trabzonspor, Metz, Delhi Dynamos, Wadi Degla
Patrice Evra=Marsala, Monza, Nice, Monaco, Manchester United, Juventus, Marseille, West Ham United
Blaise Matuidi=Troyes, Saint-Étienne, PSG, Juventus, Inter Miami
Samir Nasri=Marseille, Arsenal, Manchester City, Sevilla (kiralık), Antalyaspor, West Ham United, Anderlecht
Éric Abidal=Monaco, Lille, Lyon, Barcelona, Monaco, Olympiakos
Bacary Sagna=Auxerre, Arsenal, Manchester City, Benevento, Montreal Impact
William Gallas=Caen, Marseille, Chelsea, Arsenal, Tottenham, Perth Glory
Yohan Cabaye=Lille, Newcastle United, PSG, Crystal Palace, Al-Nasr, Saint-Étienne

#İngiltere
Stanley Matthews=Stoke City, Blackpool, Stoke City
Tom Finney=Preston North End
Bobby Charlton=Manchester United, Preston North End, Waterford United
Bobby Moore=West Ham United, Fulham, San Antonio Thunder, Seattle Sounders
Gordon Banks (KL)=Chesterfield, Leicester City, Stoke City, Fort Lauderdale Strikers
Jimmy Greaves=Chelsea, Milan, Tottenham, West Ham United
Geoff Hurst=West Ham United, Stoke City, West Bromwich Albion, Cork Celtic, Seattle Sounders
Martin Peters=West Ham United, Tottenham, Norwich City, Sheffield United
Alan Ball=Blackpool, Everton, Arsenal, Southampton, Philadelphia Fury, Vancouver Whitecaps, Blackpool, Southampton, Eastern (Hong Kong), Bristol Rovers
Kevin Keegan=Scunthorpe United, Liverpool, Hamburg, Southampton, Newcastle United
Peter Shilton (KL)=Leicester City, Stoke City, Nottingham Forest, Southampton, Derby County, Plymouth Argyle, Wimbledon, Bolton Wanderers, Coventry City, West Ham United, Leyton Orient
Bryan Robson=West Bromwich Albion, Manchester United, Middlesbrough
Gary Lineker=Leicester City, Everton, Barcelona, Tottenham, Nagoya Grampus Eight
Paul Gascoigne=Newcastle United, Tottenham, Lazio, Rangers, Middlesbrough, Everton, Burnley, Gansu Tianma, Boston United
Alan Shearer=Southampton, Blackburn Rovers, Newcastle United
Teddy Sheringham=Millwall, Aldershot (kiralık), Djurgården (kiralık), Nottingham Forest, Tottenham, Manchester United, Tottenham, Portsmouth, West Ham United, Colchester United
Tony Adams=Arsenal
David Seaman (KL)=Peterborough United, Birmingham City, Queens Park Rangers, Arsenal, Manchester City
Paul Ince=West Ham United, Manchester United, Inter, Liverpool, Middlesbrough, Wolverhampton, Swindon Town, Macclesfield Town
Michael Owen=Liverpool, Real Madrid, Newcastle United, Manchester United, Stoke City
David Beckham=Manchester United, Preston North End (kiralık), Real Madrid, LA Galaxy, Milan (kiralık), PSG
Paul Scholes=Manchester United
Steven Gerrard=Liverpool, LA Galaxy
Frank Lampard=West Ham United, Swansea City (kiralık), Chelsea, Manchester City, New York City
John Terry=Chelsea, Nottingham Forest (kiralık), Chelsea, Aston Villa
Rio Ferdinand=West Ham United, Bournemouth (kiralık), Leeds United, Manchester United, Queens Park Rangers
Ashley Cole=Arsenal, Crystal Palace (kiralık), Arsenal, Chelsea, Roma, LA Galaxy, Derby County
Joe Cole=West Ham United, Chelsea, Liverpool, Lille (kiralık), West Ham United, Aston Villa, Coventry City, Tampa Bay Rowdies
Jamie Carragher=Liverpool
Gary Neville=Manchester United
Wayne Rooney=Everton, Manchester United, Everton, DC United, Derby County
Jermain Defoe=West Ham United, Bournemouth (kiralık), Tottenham, Portsmouth, Tottenham, Toronto FC, Sunderland, Bournemouth, Rangers, Sunderland
Peter Crouch=Queens Park Rangers, Portsmouth, Aston Villa, Norwich City (kiralık), Southampton, Liverpool, Portsmouth, Tottenham, Stoke City, Burnley
Joe Hart (KL)=Shrewsbury Town, Manchester City, Tranmere Rovers (kiralık), Blackpool (kiralık), Birmingham City (kiralık), Torino (kiralık), West Ham United (kiralık), Burnley, Tottenham, Celtic
Theo Walcott=Southampton, Arsenal, Everton, Southampton
Jack Wilshere=Arsenal, Bolton Wanderers (kiralık), Bournemouth (kiralık), West Ham United, Bournemouth, AGF Aarhus

#Hollanda
Johan Cruyff=Ajax, Barcelona, Los Angeles Aztecs, Washington Diplomats, Levante, Ajax, Feyenoord
Johan Neeskens=Haarlem, Ajax, Barcelona, New York Cosmos, Groningen, Baar
Johnny Rep=Ajax, Valencia, Bastia, Saint-Étienne, PEC Zwolle, Feyenoord
Rob Rensenbrink=DWS, Club Brugge, Anderlecht, Portland Timbers, Toulouse
Ruud Krol=Ajax, Vancouver Whitecaps, Napoli, Cannes
Wim van Hanegem=Xerxes, Feyenoord, AZ, Chicago Sting, FC Utrecht, Feyenoord
Ruud Gullit=Haarlem, Feyenoord, PSV, Milan, Sampdoria, Milan, Sampdoria, Chelsea
Marco van Basten=Ajax, Milan
Frank Rijkaard=Ajax, Sporting Lizbon, Real Zaragoza, Milan, Ajax
Ronald Koeman=Groningen, Ajax, PSV, Barcelona, Feyenoord
Dennis Bergkamp=Ajax, Inter, Arsenal
Marc Overmars=Go Ahead Eagles, Willem II, Ajax, Arsenal, Barcelona, Go Ahead Eagles
Edgar Davids=Ajax, Milan, Juventus, Barcelona, Inter, Tottenham, Ajax, Crystal Palace, Barnet
Clarence Seedorf=Ajax, Sampdoria, Real Madrid, Inter, Milan, Botafogo
Patrick Kluivert=Ajax, Milan, Barcelona, Newcastle United, Valencia, PSV, Lille
Jaap Stam=Zwolle, Cambuur, Willem II, PSV, Manchester United, Lazio, Milan, Ajax
Edwin van der Sar (KL)=Ajax, Juventus, Fulham, Manchester United
Phillip Cocu=AZ, Vitesse, PSV, Barcelona, PSV
Boudewijn Zenden=PSV, Barcelona, Chelsea, Middlesbrough, Liverpool, Marseille, Sunderland
Ruud van Nistelrooy=Den Bosch, Heerenveen, PSV, Manchester United, Real Madrid, Hamburg, Málaga
Rafael van der Vaart=Ajax, Hamburg, Real Madrid, Tottenham, Hamburg, Real Betis, Midtjylland, Esbjerg
Wesley Sneijder=Ajax, Real Madrid, Inter, Galatasaray, Nice, Al-Gharafa
Arjen Robben=Groningen, PSV, Chelsea, Real Madrid, Bayern Münih, Groningen
Robin van Persie=Feyenoord, Arsenal, Manchester United, Fenerbahçe, Feyenoord
Dirk Kuyt=Utrecht, Feyenoord, Liverpool, Fenerbahçe, Feyenoord
Klaas-Jan Huntelaar=De Graafschap, AGOVV (kiralık), Heerenveen, Ajax, Real Madrid, Milan, Schalke 04, Ajax, Schalke 04

#İspanya
Luis Suárez Miramontes=Deportivo La Coruña, Barcelona, Inter, Sampdoria
Francisco Gento=Racing Santander, Real Madrid
Amancio Amaro=Deportivo La Coruña, Real Madrid
Emilio Butragueño=Real Madrid, Atlético Celaya
Andoni Zubizarreta (KL)=Athletic Bilbao, Barcelona, Valencia
Fernando Hierro=Real Valladolid, Real Madrid, Al-Rayyan, Bolton Wanderers
Raúl González=Real Madrid, Schalke 04, Al-Sadd, New York Cosmos
Pep Guardiola=Barcelona, Brescia, Roma, Brescia, Al-Ahli, Dorados de Sinaloa
Luis Enrique=Sporting Gijón, Real Madrid, Barcelona
Fernando Morientes=Albacete, Real Zaragoza, Real Madrid, Monaco (kiralık), Liverpool, Valencia, Marsilya
Gaizka Mendieta=Castellón, Valencia, Lazio, Barcelona (kiralık), Middlesbrough
Juan Carlos Valerón=Las Palmas, Mallorca, Atlético Madrid, Deportivo La Coruña, Las Palmas
Carles Puyol=Barcelona
Xavi Hernández=Barcelona, Al-Sadd
Andrés Iniesta=Barcelona, Vissel Kobe, Emirates Club
David Villa=Sporting Gijón, Real Zaragoza, Valencia, Barcelona, Atlético Madrid, New York City, Vissel Kobe
Fernando Torres=Atlético Madrid, Liverpool, Chelsea, Milan (kiralık), Atlético Madrid, Sagan Tosu
David Silva=Valencia, Eibar (kiralık), Celta Vigo (kiralık), Valencia, Manchester City, Real Sociedad
Cesc Fàbregas=Arsenal, Barcelona, Chelsea, Monaco, Como
Iker Casillas (KL)=Real Madrid, Porto
Pepe Reina (KL)=Barcelona, Villarreal, Liverpool, Napoli (kiralık), Bayern Münih (kiralık), Napoli, Milan, Aston Villa (kiralık), Lazio, Como
Víctor Valdés (KL)=Barcelona, Manchester United, Standard Liège (kiralık), Middlesbrough
Xabi Alonso=Real Sociedad, Eibar (kiralık), Liverpool, Real Madrid, Bayern Münih
Sergio Busquets=Barcelona, Inter Miami
Jordi Alba=Valencia, Gimnàstic (kiralık), Valencia, Barcelona, Inter Miami
Gerard Piqué=Manchester United, Real Zaragoza (kiralık), Barcelona
Jesús Navas=Sevilla, Manchester City, Sevilla
Marcos Senna=São Paulo, Rio Branco, Corinthians, Juventude, Villarreal, New York Cosmos

#Portekiz
Eusébio=Sporting Lourenço Marques, Benfica, Boston Minutemen, Monterrey, Toronto Metros-Croatia, Beira-Mar, Las Vegas Quicksilvers, União de Tomar, New Jersey Americans
Mário Coluna=Desportivo Lourenço Marques, Benfica, Estoril
Paulo Futre=Sporting Lizbon, Porto, Atlético Madrid, Benfica, Marsilya, Reggiana, Milan, West Ham United, Yokohama Flügels
Rui Costa=Benfica, Fafe (kiralık), Fiorentina, Milan, Benfica
Luís Figo=Sporting Lizbon, Barcelona, Real Madrid, Inter
Fernando Couto=Famalicão (kiralık), Porto, Parma, Barcelona, Lazio, Porto
Vítor Baía (KL)=Porto, Barcelona, Porto
Pauleta=Estoril, Salamanca, Deportivo La Coruña, Bordeaux, PSG
Deco=Corinthians, Benfica, Alverca (kiralık), Salgueiros (kiralık), Porto, Barcelona, Chelsea, Fluminense
Ricardo Carvalho=Porto, Leça (kiralık), Vitória Setúbal (kiralık), Alverca (kiralık), Porto, Chelsea, Real Madrid, Monaco, Shanghai SIPG
Maniche=Benfica, Alverca (kiralık), Porto, Dinamo Moskova, Chelsea (kiralık), Atlético Madrid, Inter, Köln
Simão Sabrosa=Sporting Lizbon, Barcelona, Benfica, Atlético Madrid, Beşiktaş, Espanyol
Pepe=Marítimo, Porto, Real Madrid, Beşiktaş, Porto

#Uruguay
Juan Alberto Schiaffino=Peñarol, Milan, Roma
Alcides Ghiggia=Peñarol, Roma, Milan, Danubio
Enzo Francescoli=Wanderers, River Plate, Racing Paris, Marsilya, Cagliari, Torino, River Plate
Daniel Fonseca=Nacional, Cagliari, Napoli, Roma, Juventus, Como
Álvaro Recoba=Danubio, Nacional, Inter, Venezia (kiralık), Inter, Torino (kiralık), Panionios, Danubio, Nacional
Paolo Montero=Peñarol, Atalanta, Juventus, San Lorenzo
Diego Forlán=Independiente, Manchester United, Villarreal, Atlético Madrid, Inter, Internacional, Cerezo Osaka, Peñarol, Mumbai City, Kitchee
Diego Lugano=Nacional, Plaza Colonia (kiralık), São Paulo, Fenerbahçe, PSG, Málaga, West Bromwich Albion, Cerro Porteño, São Paulo, Peñarol
Diego Godín=Cerro, Nacional, Villarreal, Atlético Madrid, Inter, Cagliari, Vélez Sarsfield, Atlético Mineiro

#Şili
Iván Zamorano=Cobresal, San Luis, Cobresal, St. Gallen, Sevilla, Real Madrid, Inter, América, Colo-Colo
Marcelo Salas=Universidad de Chile, River Plate, Lazio, Juventus, River Plate, Universidad de Chile
Jorge Valdivia=Colo-Colo, Rangers (kiralık), Servette, Colo-Colo, Palmeiras, Al-Ain, Palmeiras, Al-Wahda, Palmeiras, Colo-Colo, Monarcas Morelia, Colo-Colo, Unión La Calera
Mauricio Pinilla=Universidad de Chile, Inter, Chievo (kiralık), Sporting Lizbon, Celta Vigo, Racing Santander, Grosseto, Palermo, Cagliari, Genoa, Atalanta, Universidad de Chile, Coquimbo Unido
Claudio Bravo (KL)=Colo-Colo, Real Sociedad, Barcelona, Manchester City, Real Betis

#Kolombiya
Carlos Valderrama=Unión Magdalena, Millonarios, Deportivo Cali, Montpellier, Real Valladolid, Independiente Medellín, Atlético Junior, Tampa Bay Mutiny, Miami Fusion, Colorado Rapids, Atlético Junior
René Higuita (KL)=Millonarios, Atlético Nacional, Real Valladolid, Atlético Nacional, Veracruz, Independiente Medellín, Aucas, Deportivo Pereira, Guaros, Deportivo Rionegro
Faustino Asprilla=Cúcuta Deportivo, Atlético Nacional, Parma, Newcastle United, Parma, Palmeiras, Fluminense, Universidad de Chile, Atlante, Estudiantes
Freddy Rincón=Santa Fe, América de Cali, Palmeiras, Napoli, Real Madrid, Corinthians, Cruzeiro, Santos, Corinthians, América de Cali
Iván Córdoba=Atlético Nacional, San Lorenzo, Inter
Mario Yepes=Cortuluá, Deportivo Cali, River Plate, Nantes, PSG, Chievo, Milan, Atalanta, San Lorenzo
Faryd Mondragón (KL)=Deportivo Cali, Argentinos Juniors, Independiente, Metz, Real Zaragoza, Galatasaray, Köln, Philadelphia Union, Deportivo Cali
Fredy Guarín=Envigado, Boca Juniors, Saint-Étienne, Porto, Inter, Shanghai Shenhua, Vasco da Gama, Millonarios

#Paraguay
José Luis Chilavert (KL)=Sportivo Luqueño, Guaraní, San Lorenzo, Real Zaragoza, Vélez Sarsfield, Strasbourg, Peñarol
Carlos Gamarra=Cerro Porteño, Independiente, Internacional, Benfica, Corinthians, Atlético Mineiro, Inter, Palmeiras
Celso Ayala=River Plate, Vélez Sarsfield, River Plate, Real Betis, River Plate, Libertad
José Saturnino Cardozo=Nacional, Universidad Católica, Toluca, Cruz Azul, Toluca, Club Tijuana

#Peru
Teófilo Cubillas=Alianza Lima, Basel, Porto, Alianza Lima, Fort Lauderdale Strikers, South Florida Sun, Fort Lauderdale Strikers, Alianza Lima
Claudio Pizarro=Deportivo Pesquero, Alianza Lima, Werder Bremen, Bayern Münih, Chelsea, Werder Bremen, Bayern Münih, Werder Bremen, Köln, Werder Bremen
Nolberto Solano=Alianza Lima, Sporting Cristal, Boca Juniors, Newcastle United, Aston Villa, Newcastle United, West Ham United, Larissa, Universitario, Leicester City, Hartlepool United, Pune City
Jefferson Farfán=Alianza Lima, PSV, Schalke 04, Al-Jazira, Lokomotiv Moskova, Alianza Lima

#Ekvador
Antonio Valencia=El Nacional, Villarreal, Recreativo (kiralık), Wigan Athletic, Manchester United, LDU Quito, Querétaro
Agustín Delgado=Espoli, Barcelona SC, Necaxa, Cruz Azul, Southampton, LDU Quito, Aucas, Barcelona SC
Édison Méndez=Deportivo Quito, LDU Quito, Santos Laguna, PSV, Santos, LDU Quito, Independiente del Valle, Emelec

#Bolivya
Marco Etcheverry=Bolívar, Albacete, Colo-Colo, Bolívar, DC United

#Venezuela
Juan Arango=Zulia, Nueva Cádiz, Monterrey, Zulianos, Puebla, Monterrey, Mallorca, Borussia Mönchengladbach, New York Cosmos, Tijuana, Zulia

#Meksika
Hugo Sánchez=UNAM Pumas, San Diego Sockers (kiralık), Atlético Madrid, Real Madrid, América, Rayo Vallecano, Atlante, Linz, Dallas Burn, Atlético Celaya
Cuauhtémoc Blanco=América, Necaxa, América, Valladolid, Veracruz, América, Chicago Fire, Santos Laguna, Veracruz, Irapuato, Lobos BUAP, Dorados de Sinaloa, Puebla
Jared Borgetti=Atlas, Santos Laguna, Dorados, Bolton Wanderers, Al-Ittihad, Cruz Azul, Monterrey, Morelia
Rafael Márquez=Atlas, Monaco, Barcelona, New York Red Bulls, León, Hellas Verona, Atlas
Jorge Campos (KL)=UNAM Pumas, Atlante, LA Galaxy, Cruz Azul, Chicago Fire, UNAM Pumas, Tigres, Puebla
Luis Hernández=Cruz Azul, UANL Tigres, Necaxa, Alianza Lima, Necaxa, Boca Juniors, LA Galaxy, América, Monterrey, Veracruz, Guerreros Acapulco, Coatzacoalcos
Pavel Pardo=Atlas, América, Stuttgart, Chicago Fire, América
Andrés Guardado=Atlas, Deportivo La Coruña, Valencia, Bayer Leverkusen (kiralık), PSV, Real Betis, León

#ABD
Landon Donovan=Bayer Leverkusen, San Jose Earthquakes (kiralık), LA Galaxy, Bayern Münih (kiralık), Everton (kiralık), LA Galaxy, León, San Diego Loyal
Clint Dempsey=New England Revolution, Fulham, Tottenham, Seattle Sounders, Fulham (kiralık), Seattle Sounders
Tim Howard (KL)=North Jersey Imperials, MetroStars, Manchester United, Everton (kiralık), Everton, Colorado Rapids, Memphis 901
Brad Friedel (KL)=Brøndby, Galatasaray, Columbus Crew, Liverpool, Blackburn Rovers, Aston Villa, Tottenham
Kasey Keller (KL)=Millwall, Leicester City, Rayo Vallecano, Tottenham, Southampton (kiralık), Borussia Mönchengladbach, Fulham (kiralık), Fulham, Seattle Sounders
Claudio Reyna=Bayer Leverkusen, Wolfsburg (kiralık), Wolfsburg, Rangers, Sunderland, Manchester City, New York Red Bulls
Brian McBride=Milwaukee Rampage, VfL Wolfsburg (kiralık), Columbus Crew, Preston North End (kiralık), Everton (kiralık), Fulham, Toronto FC, Chicago Fire
Michael Bradley=MetroStars, Heerenveen, Borussia Mönchengladbach, Aston Villa (kiralık), Chievo, Roma, Toronto FC

#Kosta Rika
Paulo Wanchope=Herediano, Derby County, West Ham United, Manchester City, Málaga, Al-Gharafa, Rosario Central, Herediano, Chicago Fire, Municipal Liberia
Bryan Ruiz=Alajuelense, Gent, Twente, Fulham, PSV (kiralık), Sporting Lizbon, Santos Laguna, Alajuelense

#Honduras
David Suazo=Olimpia, Cagliari, Inter, Benfica (kiralık), Genoa (kiralık), Inter, Catania, Olimpia

#Liberya
George Weah=Young Survivors, Bong Range, Mighty Barrolle, Invincible Eleven, Tonnerre Yaoundé, Monaco, PSG, Milan, Chelsea (kiralık), Manchester City (kiralık), Marsilya, Al-Jazira

#Kamerun
Roger Milla=Éclair Douala, Léopard Douala, Tonnerre Yaoundé, Valenciennes, Monaco, Bastia, Saint-Étienne, Montpellier, JS Saint-Pierroise, Tonnerre Yaoundé, Pelita Jaya
Patrick Mboma=PSG, Châteauroux (kiralık), Metz, Gamba Osaka, Cagliari, Parma, Sunderland (kiralık), Al-Ittihad, Tokyo Verdy, Vissel Kobe
Samuel Eto'o=Real Madrid, Leganés (kiralık), Espanyol (kiralık), Mallorca (kiralık), Mallorca, Barcelona, Inter, Anzhi Makhachkala, Chelsea, Everton, Sampdoria, Antalyaspor, Konyaspor, Qatar SC
Geremi Njitap=Racing Bafoussam, Cerro Porteño, Génova (kiralık), Real Madrid, Middlesbrough (kiralık), Chelsea, Newcastle United, Ankaragücü, MK Dons
Rigobert Song=Tonnerre Yaoundé, Metz, Salernitana, Liverpool, West Ham United, 1. FC Köln, Lens, Galatasaray, Trabzonspor

#Nijerya
Jay-Jay Okocha=Enugu Rangers, Borussia Neunkirchen, Eintracht Frankfurt, Fenerbahçe, PSG, Bolton Wanderers, Qatar SC, Hull City
Nwankwo Kanu=Iwuanyanwu Nationale, Ajax, Inter, Arsenal, West Bromwich Albion, Portsmouth
Daniel Amokachi=Ranchers Bees, Club Brugge, Everton, Beşiktaş, Colorado Rapids
Taribo West=Sharks, Julius Berger, Enugu Rangers, Auxerre, Inter, Milan (kiralık), Derby County, Kaiserslautern, Partizan, Al-Arabi, Paykan, Plymouth Argyle, Wisła Kraków
Joseph Yobo=Standard Liège, Marsilya (kiralık), Everton, Fenerbahçe (kiralık), Fenerbahçe, Norwich City (kiralık)
Sunday Oliseh=Julius Berger, Liège, Reggiana, Köln, Ajax, Juventus, Borussia Dortmund, VfL Bochum, Genk
Finidi George=Calabar Rovers, Sharks, Ajax, Real Betis, Mallorca, Ipswich Town
Emmanuel Amunike=Julius Berger, Zamalek, Sporting Lizbon, Barcelona, Albacete (kiralık)
John Obi Mikel=Plateau United, Lyn Oslo, Chelsea, Tianjin TEDA, Middlesbrough, Trabzonspor, Stoke City, Kuwait SC

#Gana
Abedi Pelé=Real Tamale United, Al-Sadd, Zürich, Dragons de l'Ouémé, Niort, Mulhouse, Lille, Marsilya, Lyon, Torino, 1860 München, Al-Ain
Michael Essien=Bastia, Lyon, Chelsea, Real Madrid (kiralık), Milan, Panathinaikos, Persib Bandung, Sabail
Stephen Appiah=Hearts of Oak, Udinese, Parma, Brescia, Juventus, Fenerbahçe, Bologna, Vojvodina
Sulley Muntari=Udinese, Portsmouth, Inter, Sunderland (kiralık), Milan (kiralık), Milan, Al-Ittihad, Pescara, Deportivo La Coruña, Albacete, Hearts of Oak
Asamoah Gyan=Liberty Professionals, Udinese, Modena (kiralık), Rennes, Sunderland, Al-Ain (kiralık), Al-Ain, Shanghai SIPG, Al-Ahli, Kayserispor, NorthEast United, Legon Cities

#Fildişi Sahili
Didier Drogba=Le Mans, Guingamp, Marsilya, Chelsea, Shanghai Shenhua, Galatasaray, Chelsea, Montreal Impact, Phoenix Rising
Yaya Touré=Beveren, Metalurh Donetsk, Olympiakos, Monaco, Barcelona, Manchester City, Qingdao Huanghai
Kolo Touré=ASEC Mimosas, Arsenal, Manchester City, Liverpool, Celtic
Didier Zokora=ASEC Mimosas, Genk, Saint-Étienne, Tottenham, Sevilla, Trabzonspor, Akhisar Belediyespor, Semen Padang
Emmanuel Eboué=ASEC Mimosas, Beveren, Arsenal, Galatasaray, Sunderland

#Senegal
El Hadji Diouf=Sochaux, Rennes, Lens, Liverpool, Bolton Wanderers (kiralık), Bolton Wanderers, Sunderland, Blackburn Rovers, Rangers, Doncaster Rovers, Leeds United, Sabah
Henri Camara=Neuchâtel Xamax, Sedan, Sochaux, Wolverhampton, Celtic (kiralık), Southampton, Wigan Athletic, West Ham United (kiralık), Stoke City (kiralık), Sheffield United, Atromitos, Panetolikos
Papa Bouba Diop=Neuchâtel Xamax, Grasshopper, Lens, Fulham, Portsmouth, West Ham United, Birmingham City
Khalilou Fadiga=Liège, Club Brugge, Auxerre, Inter, Bolton Wanderers, Derby County, Coventry City

#Mali
Frédéric Kanouté=Lyon, West Ham United, Tottenham, Sevilla, Beijing Guoan
Seydou Keita=Marsilya, Lorient, Lens, Sevilla, Barcelona, Dalian Aerbin, Valencia, Roma, El Jaish
Mahamadou Diarra=OFI Girondins, Vitesse, Lyon, Real Madrid, Monaco, Fulham

#Togo
Emmanuel Adebayor=Metz, Monaco, Arsenal, Manchester City, Real Madrid (kiralık), Tottenham (kiralık), Tottenham, Crystal Palace, İstanbul Başakşehir, Kayserispor, Olimpia

#Güney Afrika
Benni McCarthy=Seven Stars, Cape Town Spurs, Ajax, Celta Vigo (kiralık), Celta Vigo, Porto, Blackburn Rovers, West Ham United, Orlando Pirates
Lucas Radebe=Kaizer Chiefs, Leeds United
Steven Pienaar=Ajax Cape Town, Ajax, Borussia Dortmund, Everton, Tottenham, Everton (kiralık), Everton, Sunderland, Bidvest Wits

#Mısır
Mohamed Aboutrika=Tersana, Al-Ahly, Baniyas
Mido=Zamalek, Gent, Ajax, Celta Vigo, Marsilya, Roma (kiralık), Tottenham, Middlesbrough, Wigan Athletic (kiralık), Zamalek (kiralık), West Ham United (kiralık), Ajax (kiralık), Barnsley
Essam El-Hadary (KL)=Damietta, Al-Ahly, FC Sion, Ismaily, Zamalek, Wadi Degla, Al-Taawoun, Nogoom, Ismaily
Ahmed Hassan=Ismaily, Kocaelispor, Gaziantepspor, Beşiktaş, Anderlecht, Al-Ahly, Zamalek

#Fas
Mustapha Hadji=Nancy, Sporting Lizbon, Deportivo La Coruña, Coventry City, Aston Villa, Espanyol, Al-Ittihad, Saarbrücken, Fola Esch
Noureddine Naybet=Wydad Casablanca, Nantes, Sporting Lizbon, Deportivo La Coruña, Tottenham
Marouane Chamakh=Bordeaux, Arsenal, West Ham United (kiralık), Crystal Palace, Cardiff City

#Cezayir
Lakhdar Belloumi=GC Mascara, MC Oran, Mohammédia
Rabah Madjer=NA Hussein Dey, Racing Paris, Porto, Valencia, Porto, Qatar SC

#Zambiya
Kalusha Bwalya=Mufulira Blackpool, Cercle Brugge, PSV, América, Necaxa, León, Irapuato, Correcaminos, Veracruz

#Rusya / SSCB
Lev Yashin (KL)=Dinamo Moskova
Aleksandr Mostovoi=Spartak Moskova, Benfica, Caen, Strasbourg, Celta Vigo, Alavés
Valeri Karpin=Fakel Voronezh, Spartak Moskova, Real Sociedad, Valencia, Celta Vigo, Real Sociedad
Andrey Arshavin=Zenit, Arsenal, Zenit (kiralık), Zenit, Kuban Krasnodar, Kayrat
Aleksandr Kerzhakov=Zenit, Sevilla, Dinamo Moskova, Zenit, Zürich (kiralık)
Yuri Zhirkov=Tambov, CSKA Moskova, Chelsea, Anzhi Makhachkala, Dinamo Moskova, Zenit, Khimki

#Ukrayna
Oleg Blokhin=Dinamo Kiev, Vorwärts Steyr, Aris Limassol
Igor Belanov=Chernomorets Odessa, Dinamo Kiev, Borussia Mönchengladbach, Eintracht Braunschweig, Chernomorets Odessa
Andriy Shevchenko=Dinamo Kiev, Milan, Chelsea, Milan (kiralık), Dinamo Kiev
Serhiy Rebrov=Shakhtar Donetsk, Dinamo Kiev, Tottenham, Fenerbahçe (kiralık), West Ham United (kiralık), Dinamo Kiev, Rubin Kazan
Anatoliy Tymoshchuk=Volyn Lutsk, Shakhtar Donetsk, Zenit, Bayern Münih, Zenit, Kairat
Andriy Voronin=Borussia Mönchengladbach, Mainz, Köln, Bayer Leverkusen, Liverpool, Hertha Berlin (kiralık), Dinamo Moskova, Fortuna Düsseldorf

#Gürcistan
Kakha Kaladze=Dinamo Tiflis, Dinamo Kiev, Milan, Genoa

#Bulgaristan
Hristo Stoichkov=CSKA Sofya, Barcelona, Parma, Barcelona, Al-Nassr, Kashiwa Reysol, CSKA Sofya, Chicago Fire, DC United
Dimitar Berbatov=CSKA Sofya, Bayer Leverkusen, Tottenham, Manchester United, Fulham, Monaco, PAOK, Kerala Blasters
Krasimir Balakov=Etar, Sporting Lizbon, Stuttgart
Yordan Letchkov=Sliven, CSKA Sofya, Hamburg, Marsilya, Beşiktaş, CSKA Sofya
Lyuboslav Penev=CSKA Sofya, Valencia, Atlético Madrid, Compostela, Celta Vigo, Levski Sofya

#Romanya
Gheorghe Hagi=Farul Constanța, Sportul Studențesc, Steaua Bükreş, Real Madrid, Brescia, Barcelona, Galatasaray
Gheorghe Popescu=Universitatea Craiova, Steaua Bükreş, PSV, Tottenham, Barcelona, Galatasaray, Lecce, Dinamo Bükreş, Hannover 96
Dan Petrescu=Steaua Bükreş, Foggia, Genoa, Sheffield Wednesday, Chelsea, Bradford City, Southampton, National Bükreş
Ilie Dumitrescu=Steaua Bükreş, Tottenham, Sevilla (kiralık), Tottenham, West Ham United, Steaua Bükreş, América, FC Nürnberg
Miodrag Belodedici=Steaua Bükreş, Estrela Amadora, Valencia, Villarreal, Steaua Bükreş, Atlante
Marius Lăcătuș=Steaua Bükreş, Fiorentina, Oviedo, Steaua Bükreş, National Bükreş, Steaua Bükreş
Adrian Mutu=Argeș Pitești, Dinamo Bükreş, Inter, Hellas Verona, Parma, Chelsea, Juventus, Fiorentina, Cesena, Ajaccio, Petrolul Ploiești, Pune City, ASA Târgu Mureș
Cristian Chivu=Universitatea Craiova, Ajax, Roma, Inter

#Çekya / Çekoslovakya
Josef Masopust=Union Teplice, Dukla Prag, Crossing Molenbeek
Antonín Panenka=Bohemians Prag, Rapid Wien, Sankt Pölten
Pavel Nedvěd=Sklo Union Teplice, Dukla Prag, Sparta Prag, Lazio, Juventus
Karel Poborský=Dynamo Budějovice, Viktoria Žižkov, Slavia Prag, Manchester United, Benfica, Lazio, Sparta Prag, Dynamo Budějovice
Vladimír Šmicer=Slavia Prag, Lens, Liverpool, Bordeaux, Slavia Prag
Patrik Berger=Sparta Prag, Slavia Prag, Borussia Dortmund, Liverpool, Portsmouth, Aston Villa, Sparta Prag
Tomáš Rosický=Sparta Prag, Borussia Dortmund, Arsenal, Sparta Prag
Petr Čech (KL)=Chmel Blšany, Sparta Prag, Rennes, Chelsea, Arsenal
Milan Baroš=Baník Ostrava, Liverpool, Aston Villa, Lyon, Portsmouth (kiralık), Galatasaray, Baník Ostrava, Antalyaspor, Slovan Liberec, Baník Ostrava
Jan Koller=Sparta Prag, Lokeren, Anderlecht, Borussia Dortmund, Monaco, Nürnberg, Krylia Sovetov, Cannes

#Slovakya
Marek Hamšík=Slovan Bratislava, Brescia, Napoli, Dalian Yifang, IFK Göteborg, Trabzonspor
Martin Škrtel=Trenčín, Zenit, Liverpool, Fenerbahçe, İstanbul Başakşehir, Spartak Trnava

#Polonya
Grzegorz Lato=Stal Mielec, Lokeren, Atlante
Kazimierz Deyna=Włókniarz Starogard, Legia Varşova, Manchester City, San Diego Sockers
Zbigniew Boniek=Zawisza Bydgoszcz, Widzew Łódź, Juventus, Roma
Jerzy Dudek (KL)=Concordia Knurów, Sokół Tychy, Feyenoord, Liverpool, Real Madrid
Jakub Błaszczykowski=Górnik Zabrze, Wisła Kraków, Borussia Dortmund, Fiorentina (kiralık), Wolfsburg, Wisła Kraków

#Macaristan
Ferenc Puskás=Kispest Honvéd, Real Madrid
Sándor Kocsis=Ferencváros, Honvéd, Young Fellows Zürich, Barcelona
Nándor Hidegkuti=Herminamező, Elektromos, Herminamező, MTK Budapeşte
József Bozsik=Kispest Honvéd
Flórián Albert=Ferencváros
Lajos Détári=Honvéd, Eintracht Frankfurt, Olympiakos, Bologna, Ancona, Genoa, Honvéd

#Hırvatistan
Davor Šuker=Osijek, Dinamo Zagreb, Sevilla, Real Madrid, Arsenal, West Ham United, 1860 München
Zvonimir Boban=Dinamo Zagreb, Bari (kiralık), Milan, Celta Vigo (kiralık)
Robert Prosinečki=Dinamo Zagreb, Kızılyıldız, Real Madrid, Oviedo, Barcelona, Sevilla, Kızılyıldız, Standard Liège, Portsmouth, NK Zagreb, Olimpija Ljubljana
Robert Jarni=Hajduk Split, Bari, Torino, Juventus, Real Betis, Coventry City, Real Madrid, Las Palmas, Panathinaikos
Slaven Bilić=Hajduk Split, Karlsruher SC, West Ham United, Everton, Hajduk Split
Igor Štimac=Hajduk Split, Dinamo Vinkovci, Cádiz, Hajduk Split, Derby County, West Ham United, Hajduk Split
Darijo Srna=Hajduk Split, Shakhtar Donetsk, Cagliari
Ivica Olić=Marsonia, Hertha Berlin, Dinamo Zagreb, CSKA Moskova, Hamburg, Bayern Münih, Wolfsburg, Hamburg, 1860 München
Mario Mandžukić=Marsonia, Zagreb, Dinamo Zagreb, Wolfsburg, Bayern Münih, Atlético Madrid, Juventus, Al-Duhail, Milan
Ivan Rakitić=Basel, Schalke 04, Sevilla, Barcelona, Sevilla, Al-Shabab
Vedran Ćorluka=Dinamo Zagreb, Inter Zaprešić (kiralık), Manchester City, Tottenham, Bayer Leverkusen (kiralık), Lokomotiv Moskova, Rubin Kazan (kiralık)
Alen Bokšić=Hajduk Split, Cannes, Marsilya, Lazio, Juventus, Lazio, Middlesbrough

#Sırbistan
Dragan Džajić=Kızılyıldız, Bastia
Dragan Stojković=Radnički Niš, Kızılyıldız, Marsilya, Hellas Verona (kiralık), Marsilya, Nagoya Grampus Eight
Siniša Mihajlović=Vojvodina, Kızılyıldız, Roma, Sampdoria, Lazio, Inter
Dejan Stanković=Kızılyıldız, Lazio, Inter
Nemanja Vidić=Kızılyıldız, Spartak Subotica (kiralık), Spartak Moskova, Manchester United, Inter
Branislav Ivanović=Kızılyıldız, Lokomotiv Moskova, Chelsea, Zenit, West Bromwich Albion
Aleksandar Kolarov=Čukarički, OFK Belgrad, Lazio, Manchester City, Roma, Inter

#Karadağ
Dejan Savićević=Budućnost, Kızılyıldız, Milan, Rapid Wien, Kızılyıldız
Predrag Mijatović=Budućnost, Partizan, Valencia, Real Madrid, Fiorentina, Levante

#Kuzey Makedonya
Darko Pančev=Vardar, Kızılyıldız, Inter, Leipzig (kiralık), Fortuna Düsseldorf, Sion, Ginzan

#Bosna-Hersek
Hasan Salihamidžić=Hamburg, Bayern Münih, Juventus, Wolfsburg
Zvjezdan Misimović=Bayern Münih, VfL Bochum, Nürnberg, Wolfsburg, Galatasaray, Dinamo Moskova, Guizhou Renhe, Changchun Yatai
Vedad Ibišević=Paris Saint-Germain, Dijon, Alemannia Aachen, Hoffenheim, Stuttgart, Hertha Berlin, Schalke 04
Elvir Bolić=Sloboda Tuzla, Galatasaray, Fenerbahçe, Rayo Vallecano, Fenerbahçe, Rizespor, Gaziantepspor, Ankaraspor

#Slovenya
Zlatko Zahovič=Maribor, Partizan, Proodeftiki, Vitória Guimarães, Porto, Olympiakos, Valencia, Benfica
Samir Handanović (KL)=Domžale, Udinese, Rimini (kiralık), Lazio (kiralık), Treviso (kiralık), Udinese, Inter

#İsveç
Gunnar Nordahl=Hörnefors, Degerfors, IFK Norrköping, Milan, Roma, Karlstad
Nils Liedholm=IK Sleipner, IFK Norrköping, Milan
Tomas Brolin=GIF Sundsvall, IFK Norrköping, Parma, Leeds United, Zürich (kiralık), Crystal Palace
Martin Dahlin=Malmö, Borussia Mönchengladbach, Roma, Blackburn Rovers, Hamburg
Henrik Larsson=Högaborg, Helsingborg, Feyenoord, Celtic, Barcelona, Helsingborg, Manchester United (kiralık), Helsingborg, Landskrona
Freddie Ljungberg=Halmstad, Arsenal, West Ham United, Seattle Sounders, Chicago Fire, Celtic, Shimizu S-Pulse, Mumbai City
Olof Mellberg=Gylle, Degerfors, AIK, Racing Santander, Aston Villa, Juventus, Olympiakos, Villarreal
Zlatan Ibrahimović=Malmö, Ajax, Juventus, Inter, Barcelona, Milan (kiralık), Milan, PSG, Manchester United, LA Galaxy, Milan
Kim Källström=BK Häcken, Djurgården, Rennes, Lyon, Spartak Moskova, Arsenal (kiralık), Grasshopper, Djurgården

#Danimarka
Michael Laudrup=Brøndby, Lazio, Juventus, Barcelona, Real Madrid, Vissel Kobe, Ajax
Brian Laudrup=Brøndby, Bayer Uerdingen, Bayern Münih, Fiorentina, Milan, Rangers, Chelsea, Copenhagen, Ajax
Peter Schmeichel (KL)=Hvidovre, Brøndby, Manchester United, Sporting Lizbon, Aston Villa, Manchester City
Preben Elkjær=Vanløse, Køln, Lokeren, Hellas Verona, Vejle
Allan Simonsen=Vejle, Borussia Mönchengladbach, Barcelona, Charlton Athletic, Vejle
Jon Dahl Tomasson=Køge, Heerenveen, Newcastle United, Feyenoord, Milan, Stuttgart, Villarreal, Feyenoord
Thomas Gravesen=Vejle, Hamburg, Everton, Real Madrid, Celtic, Everton (kiralık)
Simon Kjær=Midtjylland, Palermo, Wolfsburg, Roma (kiralık), Lille, Fenerbahçe, Sevilla, Atalanta (kiralık), Milan

#Norveç
Ole Gunnar Solskjær=Clausenengen, Molde, Manchester United
John Arne Riise=Aalesund, Monaco, Liverpool, Roma, Fulham, APOEL, Delhi Dynamos, Aalesund
John Carew=Lørenskog, Vålerenga, Rosenborg, Valencia, Roma, Beşiktaş, Lyon, Aston Villa, Stoke City (kiralık), West Ham United
Tore André Flo=Sogndal, Tromsø, Brann, Chelsea, Rangers, Sunderland, Siena, Valerenga, Leeds United, MK Dons

#Finlandiya
Jari Litmanen=Reipas, HJK, MyPa, Ajax, Barcelona, Liverpool, Ajax, Hansa Rostock, Malmö, Lahti, Fulham, Lahti, HJK
Sami Hyypiä=Kumu, MyPa, Willem II, Liverpool, Bayer Leverkusen

#İzlanda
Eiður Guðjohnsen=Valur, PSV, KR Reykjavík, Bolton Wanderers, Chelsea, Barcelona, Monaco, Tottenham (kiralık), Stoke City (kiralık), Fulham, AEK, Cercle Brugge, Club Brugge, Bolton Wanderers, Shijiazhuang, Molde, Pune City

#İskoçya
Denis Law=Huddersfield Town, Manchester City, Torino, Manchester United, Manchester City
Kenny Dalglish=Celtic, Liverpool
Graeme Souness=Tottenham, Middlesbrough, Liverpool, Sampdoria, Rangers
Alan Hansen=Partick Thistle, Liverpool
Ally McCoist=St Johnstone, Sunderland, Rangers, Kilmarnock

#Galler
Ian Rush=Chester City, Liverpool, Juventus, Liverpool (kiralık), Liverpool, Leeds United, Newcastle United, Sheffield United (kiralık), Wrexham, Sydney Olympic
Mark Hughes=Manchester United, Barcelona, Bayern Münih (kiralık), Manchester United, Chelsea, Southampton, Everton, Blackburn Rovers
Ryan Giggs=Manchester United
Gary Speed=Leeds United, Everton, Newcastle United, Bolton Wanderers, Sheffield United
Craig Bellamy=Norwich City, Coventry City, Newcastle United, Celtic (kiralık), Blackburn Rovers, Liverpool, West Ham United, Manchester City, Cardiff City (kiralık), Liverpool, Cardiff City
Gareth Bale=Southampton, Tottenham, Real Madrid, Tottenham (kiralık), Real Madrid, Los Angeles FC

#Kuzey İrlanda
George Best=Manchester United, Jewish Guild, Stockport County, Cork Celtic, Los Angeles Aztecs, Fulham, Fort Lauderdale Strikers, Hibernian, San Jose Earthquakes, Bournemouth, Brisbane Lions
Pat Jennings (KL)=Newry Town, Watford, Tottenham, Arsenal

#İrlanda
Liam Brady=Arsenal, Juventus, Sampdoria, Inter, Ascoli, West Ham United
Paul McGrath=St Patrick's Athletic, Manchester United, Aston Villa, Derby County, Sheffield United
Roy Keane=Cobh Ramblers, Nottingham Forest, Manchester United, Celtic
Robbie Keane=Wolverhampton, Coventry City, Inter, Leeds United, Tottenham, Liverpool, Tottenham, Celtic (kiralık), LA Galaxy, Aston Villa (kiralık), ATK
Damien Duff=Blackburn Rovers, Chelsea, Newcastle United, Fulham, Melbourne City, Shamrock Rovers
Shay Given (KL)=Celtic, Blackburn Rovers, Swindon Town (kiralık), Sunderland (kiralık), Newcastle United, Manchester City, Aston Villa, Middlesbrough (kiralık), Stoke City

#Belçika
Jan Ceulemans=Lierse, Club Brugge
Enzo Scifo=Anderlecht, Inter, Bordeaux, Auxerre, Torino, Monaco, Anderlecht, Charleroi
Michel Preud'homme (KL)=Standard Liège, Mechelen, Benfica
Marc Wilmots=Sint-Truiden, Mechelen, Standard Liège, Schalke 04, Bordeaux, Schalke 04
Vincent Kompany=Anderlecht, Hamburg, Manchester City, Anderlecht
Marouane Fellaini=Standard Liège, Everton, Manchester United, Shandong Taishan
Thomas Vermaelen=Ajax, Waalwijk (kiralık), Ajax, Arsenal, Barcelona, Roma (kiralık), Barcelona, Vissel Kobe
Jan Vertonghen=Ajax, Waalwijk (kiralık), Ajax, Tottenham, Benfica, Anderlecht
Toby Alderweireld=Ajax, Atlético Madrid, Southampton (kiralık), Tottenham, Al-Duhail, Royal Antwerp
Dries Mertens=Eendracht Aalst, AGOVV, Utrecht, PSV, Napoli, Galatasaray
Eden Hazard=Lille, Chelsea, Real Madrid

#Avusturya
Hans Krankl=Rapid Wien, Wiener AC, Rapid Wien, Barcelona, Rapid Wien, First Vienna, Wiener Sport-Club, Kremser SC, Austria Salzburg
Herbert Prohaska=Austria Wien, Inter, Roma, Austria Wien
Toni Polster=Austria Wien, Torino, Sevilla, Logroñés, Rayo Vallecano, Köln, Borussia Mönchengladbach, Salzburg, Austria Wien
Andreas Herzog=Rapid Wien, First Vienna, Rapid Wien, Werder Bremen, Bayern Münih, Werder Bremen, LA Galaxy, Untersiebenbrunn

#İsviçre
Stéphane Chapuisat=Malley, Lausanne, Bayer Uerdingen, Borussia Dortmund, Grasshopper, Young Boys, Lausanne
Ciriaco Sforza=Grasshopper, Aarau, Grasshopper, Kaiserslautern, Bayern Münih, Inter, Kaiserslautern, Bayern Münih, Kaiserslautern, Luzern
Alexander Frei=Basel, Thun, Servette, Rennes, Borussia Dortmund, Basel
Stephan Lichtsteiner=Grasshopper, Lille, Lazio, Juventus, Arsenal, Augsburg

#Yunanistan
Theodoros Zagorakis=Kavala, PAOK, Leicester City, AEK, Bologna, PAOK
Giorgos Karagounis=Apollon Smyrnis, Panathinaikos, Inter, Panathinaikos, Fulham
Angelos Charisteas=Aris, Werder Bremen, Ajax, Feyenoord, Nürnberg, Bayer Leverkusen, Schalke 04, Arles-Avignon, Panetolikos
Antonios Nikopolidis (KL)=Panathinaikos, Olympiakos

#Japonya
Hidetoshi Nakata=Bellmare Hiratsuka, Perugia, Roma, Parma, Bologna (kiralık), Fiorentina (kiralık), Bolton Wanderers (kiralık)
Shunsuke Nakamura=Yokohama Marinos, Reggina, Celtic, Espanyol, Yokohama F. Marinos, Júbilo Iwata, Yokohama FC
Shinji Okazaki=Shimizu S-Pulse, Stuttgart, Mainz, Leicester City, Málaga, Huesca, Cartagena, Sint-Truiden
Yasuhito Endō=Yokohama Flügels, Kyoto Purple Sanga, Gamba Osaka, Júbilo Iwata

#Güney Kore
Cha Bum-kun=Korea University, ROK Air Force, Darmstadt, Eintracht Frankfurt, Bayer Leverkusen
Park Ji-sung=Kyoto Purple Sanga, PSV, Manchester United, Queens Park Rangers, PSV (kiralık)
Ahn Jung-hwan=Busan Daewoo, Perugia, Shimizu S-Pulse, Yokohama F. Marinos, Metz, Suwon Bluewings, Busan IPark, Dalian Shide
Lee Young-pyo=Anyang Cheetahs, PSV, Tottenham, Borussia Dortmund, Al-Hilal, Vancouver Whitecaps

#İran
Ali Daei=Taxirani, Bank Tejarat, Persepolis, Al-Sadd, Bayern Münih, Hertha Berlin, Al-Shabab, Persepolis, Saba Battery
Mehdi Mahdavikia=Bank Melli, Persepolis, VfL Bochum, Hamburg, Eintracht Frankfurt, Steel Azin, Damash Gilan, Persepolis
Ali Karimi=Fath Tehran, Persepolis, Al-Ahli, Bayern Münih, Qatar SC, Steel Azin, Persepolis, Schalke 04, Tractor Sazi

#Suudi Arabistan
Saeed Al-Owairan=Al-Shabab
Sami Al-Jaber=Al-Hilal, Wolverhampton (kiralık), Al-Hilal
Mohamed Al-Deayea (KL)=Al-Ta'ee, Al-Hilal

#Çin
Hao Haidong=Bayi, Dalian Wanda, Sheffield United
Zheng Zhi=Shenzhen Jianlibao, Charlton Athletic, Celtic, Guangzhou Evergrande

#Avustralya
Tim Cahill=Millwall, Everton, New York Red Bulls, Shanghai Shenhua, Hangzhou Greentown, Melbourne City, Millwall, Jamshedpur
Harry Kewell=Leeds United, Liverpool, Galatasaray, Melbourne Victory, Al-Gharafa
Mark Viduka=Melbourne Knights, Kızılyıldız, Celtic, Leeds United, Middlesbrough, Newcastle United
Mark Schwarzer (KL)=Marconi Stallions, Dynamo Dresden, Kaiserslautern, Bradford City, Middlesbrough, Fulham, Chelsea, Leicester City
Mark Bresciano=Carlton, Empoli, Parma, Palermo, Lazio, Al-Nasr, Al-Gharafa
`
