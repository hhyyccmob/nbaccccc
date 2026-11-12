import {PLAYER_PHOTOS} from './photos.js';
// History ratings use each player's highest available NBA 2K overall (2K16–2K21, 2K25, 2K27).
// 2K attributes are mapped to the game scale; active ratings use the 2026-27 ESPN snapshot.
// These are fan-game values, not official NBA ratings or projections.
const historyRaw = [
['PG', `魔术师约翰逊|Magic Johnson|32|1987|96|82|70|99|87
奥斯卡·罗伯特森|Oscar Robertson|1|1964|96|83|75|96|91
伊赛亚·托马斯|Isiah Thomas|11|1990|90|85|76|94|58
约翰·斯托克顿|John Stockton|12|1995|86|91|88|98|55
加里·佩顿|Gary Payton|20|1996|88|98|76|87|65
鲍勃·库西|Bob Cousy|14|1957|85|73|65|93|60
蒂姆·哈达威|Tim Hardaway|10|1997|87|74|86|90|50
马克·普莱斯|Mark Price|25|1993|86|68|94|89|48
斯蒂芬·库里|Stephen Curry|30|2016|99|74|99|91|62
克里斯·保罗|Chris Paul|3|2008|92|93|88|98|59
史蒂夫·纳什|Steve Nash|13|2006|92|59|96|99|48
拉塞尔·威斯布鲁克|Russell Westbrook|0|2017|94|73|63|93|91
达米安·利拉德|Damian Lillard|0|2020|95|60|95|85|48
凯里·欧文|Kyrie Irving|11|2016|94|64|93|84|49
卢卡·东契奇|Luka Doncic|77|2024|98|65|89|97|86
德里克·罗斯|Derrick Rose|1|2011|94|73|70|87|56`],
['SG', `迈克尔·乔丹|Michael Jordan|23|1991|99|98|78|89|80
克莱德·德雷克斯勒|Clyde Drexler|22|1992|93|85|76|85|78
杰里·韦斯特|Jerry West|44|1970|95|93|88|90|62
乔治·格文|George Gervin|44|1980|96|65|73|66|65
雷吉·米勒|Reggie Miller|31|1994|90|73|97|66|45
乔·杜马斯|Joe Dumars|4|1989|83|94|85|77|42
米奇·里奇蒙德|Mitch Richmond|2|1995|89|78|92|68|53
德拉任·彼得洛维奇|Drazen Petrovic|3|1993|86|65|95|70|42
科比·布莱恩特|Kobe Bryant|24|2008|98|94|85|84|68
德维恩·韦德|Dwyane Wade|3|2009|97|92|63|89|67
詹姆斯·哈登|James Harden|13|2019|98|65|93|94|70
阿伦·艾弗森|Allen Iverson|3|2001|96|75|73|83|45
雷·阿伦|Ray Allen|34|2001|91|76|98|74|52
克莱·汤普森|Klay Thompson|11|2016|89|92|98|57|47
德文·布克|Devin Booker|1|2023|94|72|90|82|52
马努·吉诺比利|Manu Ginobili|20|2005|88|87|87|87|58`],
['SF', `拉里·伯德|Larry Bird|33|1986|97|87|96|94|88
朱利叶斯·欧文|Julius Erving|6|1981|95|88|63|78|79
斯科蒂·皮蓬|Scottie Pippen|33|1994|88|99|77|90|82
埃尔金·贝勒|Elgin Baylor|22|1962|96|78|65|78|94
约翰·哈夫利切克|John Havlicek|17|1971|91|93|81|84|72
多米尼克·威尔金斯|Dominique Wilkins|21|1986|96|64|71|60|76
里克·巴里|Rick Barry|24|1975|94|80|88|86|73
阿德里安·丹特利|Adrian Dantley|4|1984|94|60|61|67|62
勒布朗·詹姆斯|LeBron James|6|2013|99|95|84|98|87
凯文·杜兰特|Kevin Durant|35|2014|99|83|95|81|78
科怀·伦纳德|Kawhi Leonard|2|2019|95|98|89|75|78
保罗·乔治|Paul George|13|2019|91|94|92|77|77
特雷西·麦克格雷迪|Tracy McGrady|1|2003|98|77|88|86|70
卡梅隆·安东尼|Carmelo Anthony|7|2013|95|63|89|62|76
保罗·皮尔斯|Paul Pierce|34|2002|92|81|89|79|72
吉米·巴特勒|Jimmy Butler|22|2023|91|94|68|87|72`],
['PF', `卡尔·马龙|Karl Malone|32|1997|97|88|60|76|94
查尔斯·巴克利|Charles Barkley|34|1993|96|72|65|84|99
丹尼斯·罗德曼|Dennis Rodman|91|1996|54|99|30|62|99
凯文·麦克海尔|Kevin McHale|32|1987|92|92|42|55|86
鲍勃·佩蒂特|Bob Pettit|9|1959|94|78|65|63|98
埃尔文·海耶斯|Elvin Hayes|11|1975|88|90|45|48|95
肖恩·坎普|Shawn Kemp|40|1996|88|88|40|60|91
拉里·约翰逊|Larry Johnson|2|1993|88|76|73|77|87
蒂姆·邓肯|Tim Duncan|21|2003|94|99|40|78|96
凯文·加内特|Kevin Garnett|21|2004|93|99|67|87|97
德克·诺维茨基|Dirk Nowitzki|41|2011|97|73|95|69|81
扬尼斯·阿德托昆博|Giannis Antetokounmpo|34|2021|98|97|50|85|96
安东尼·戴维斯|Anthony Davis|3|2020|93|99|70|65|94
保罗·加索尔|Pau Gasol|16|2010|88|85|58|83|89
克里斯·波什|Chris Bosh|1|2014|85|87|85|65|80
德雷蒙德·格林|Draymond Green|23|2016|75|98|82|92|86`],
['C', `哈基姆·奥拉朱旺|Hakeem Olajuwon|34|1994|97|99|35|75|94
卡里姆·阿卜杜勒-贾巴尔|Kareem Abdul-Jabbar|33|1972|99|95|30|74|97
威尔特·张伯伦|Wilt Chamberlain|13|1967|99|96|25|83|99
比尔·拉塞尔|Bill Russell|6|1965|79|99|25|78|99
大卫·罗宾逊|David Robinson|50|1995|95|98|46|68|94
帕特里克·尤因|Patrick Ewing|33|1990|94|96|45|52|91
摩西·马龙|Moses Malone|2|1983|94|85|25|45|99
比尔·沃顿|Bill Walton|32|1977|83|96|35|91|94
沙奎尔·奥尼尔|Shaquille O'Neal|34|2000|99|93|20|72|97
尼古拉·约基奇|Nikola Jokic|15|2023|98|74|86|99|95
乔尔·恩比德|Joel Embiid|21|2023|98|93|83|74|92
德怀特·霍华德|Dwight Howard|12|2009|87|99|20|45|98
姚明|Yao Ming|11|2007|92|86|58|65|88
本·华莱士|Ben Wallace|3|2004|51|99|20|45|96
马克·加索尔|Marc Gasol|33|2013|82|96|65|86|78
阿隆佐·莫宁|Alonzo Mourning|33|2000|87|98|30|48|87`]
];
const activeRaw = [
['C', `尼古拉·约基奇|Nikola Jokic|15|2027|96|92|65|99|93|DEN|2026-27
维克托·文班亚马|Victor Wembanyama|1|2027|99|99|73|76|99|SA|2026-27
伊维察·祖巴茨|Ivica Zubac|40|2027|85|77|35|72|88|IND|2026-27
以赛亚·哈尔滕施泰因|Isaiah Hartenstein|55|2027|83|84|39|77|93|OKC|2026-27
多诺万·克林根|Donovan Clingan|23|2027|91|96|79|69|93|POR|2026-27
布鲁克·洛佩斯|Brook Lopez|11|2027|92|78|78|67|75|LAC|2026-27
迈尔斯·特纳|Myles Turner|3|2027|81|93|66|73|78|MIL|2026-27
纳兹·里德|Naz Reid|0|2027|88|78|75|71|86|CHA|2026-27
阿尔佩伦·申京|Alperen Sengun|28|2027|95|84|86|96|89|HOU|2026-27
卡尔-安东尼·唐斯|Karl-Anthony Towns|32|2027|98|87|83|76|99|NY|2026-27
乔尔·恩比德|Joel Embiid|21|2027|88|82|52|80|91|PHI|2026-27
巴姆·阿德巴约|Bam Adebayo|13|2027|94|84|56|76|87|MIA|2026-27
鲁迪·戈贝尔|Rudy Gobert|27|2027|80|88|33|69|99|MIN|2026-27
杰伦·杜伦|Jalen Duren|0|2027|93|82|40|72|84|DET|2026-27
贾勒特·阿伦|Jarrett Allen|31|2027|93|84|95|69|85|CLE|2026-27
沃克·凯斯勒|Walker Kessler|14|2027|97|99|36|68|94|LAL|2026-27`],
['PF', `扬尼斯·阿德托昆博|Giannis Antetokounmpo|7|2027|99|93|60|87|99|MIA|2026-27
安东尼·戴维斯|Anthony Davis|23|2027|97|90|74|72|89|WSH|2026-27
切特·霍姆格伦|Chet Holmgren|7|2027|86|99|72|69|89|OKC|2026-27
卡梅伦·布泽尔|Cameron Boozer|27|2027|86|84|74|85|92|MEM|2026-27
小迈克尔·波特|Michael Porter Jr.|17|2027|95|83|81|68|83|BKN|2026-27
阿隆·戈登|Aaron Gordon|32|2027|86|78|68|72|75|DEN|2026-27
乔纳森·库明加|Jonathan Kuminga|24|2027|86|83|77|76|78|MIN|2026-27
奥涅卡·奥孔古|Onyeka Okongwu|17|2027|90|83|70|75|85|ATL|2026-27
埃文·莫布里|Evan Mobley|4|2027|95|83|85|79|85|CLE|2026-27
帕斯卡尔·西亚卡姆|Pascal Siakam|43|2027|95|77|68|79|80|IND|2026-27
朱利叶斯·兰德尔|Julius Randle|30|2027|93|77|76|84|81|BKN|2026-27
锡安·威廉森|Zion Williamson|1|2027|98|88|78|75|76|NO|2026-27
劳里·马尔卡宁|Lauri Markkanen|23|2027|91|79|85|72|81|UTAH|2026-27
小贾伦·杰克逊|Jaren Jackson Jr.|20|2027|92|79|73|72|74|UTAH|2026-27
小贾巴里·史密斯|Jabari Smith Jr.|10|2027|95|83|89|73|79|HOU|2026-27
多曼塔斯·萨博尼斯|Domantas Sabonis|11|2027|97|89|82|88|99|SAC|2026-27`],
['PG', `卢卡·东契奇|Luka Doncic|77|2027|99|91|98|95|83|LAL|2026-27
谢伊·吉尔杰斯-亚历山大|Shai Gilgeous-Alexander|2|2027|99|85|84|84|70|OKC|2026-27
达米安·利拉德|Damian Lillard|0|2027|92|76|78|82|68|POR|2026-27
拉梅洛·鲍尔|LaMelo Ball|1|2027|92|81|82|89|68|MIN|2026-27
詹姆斯·哈登|James Harden|1|2027|87|81|78|87|74|CLE|2026-27
达龙·福克斯|De'Aaron Fox|4|2027|91|83|72|88|70|SA|2026-27
达里厄斯·加兰|Darius Garland|10|2027|95|72|79|91|62|LAC|2026-27
贾·莫兰特|Ja Morant|1|2027|94|75|81|86|65|POR|2026-27
凯德·坎宁安|Cade Cunningham|2|2027|97|90|76|95|76|DET|2026-27
泰雷斯·哈利伯顿|Tyrese Haliburton|0|2027|98|85|81|99|72|IND|2026-27
杰伦·布伦森|Jalen Brunson|11|2027|96|76|80|87|67|NY|2026-27
斯蒂芬·库里|Stephen Curry|30|2027|99|79|97|82|70|GS|2026-27
泰雷斯·马克西|Tyrese Maxey|0|2027|99|85|78|85|69|PHI|2026-27
贾马尔·穆雷|Jamal Murray|27|2027|99|83|95|89|75|DEN|2026-27
特雷·杨|Trae Young|3|2027|90|79|71|99|68|WSH|2026-27
凯里·欧文|Kyrie Irving|11|2027|96|82|81|82|69|DAL|2026-27`],
['SF', `杰森·塔图姆|Jayson Tatum|0|2027|98|80|73|96|79|BOS|2026-27
凯文·杜兰特|Kevin Durant|7|2027|96|85|76|76|77|HOU|2026-27
杰伦·约翰逊|Jalen Johnson|1|2027|92|84|63|95|88|ATL|2026-27
布兰登·米勒|Brandon Miller|24|2027|91|81|72|72|74|CHA|2026-27
OG·阿奴诺比|OG Anunoby|8|2027|88|81|71|73|77|NY|2026-27
特雷·墨菲三世|Trey Murphy III|25|2027|90|77|77|78|73|NO|2026-27
AJ·迪班萨|AJ Dybantsa|4|2027|88|79|66|73|77|WSH|2026-27
亚克塞尔·伦德博格|Yaxel Lendeborg|1|2027|96|84|81|80|82|GS|2026-27
勒布朗·詹姆斯|LeBron James|23|2027|87|88|59|92|83|PHI|2026-27
科怀·伦纳德|Kawhi Leonard|2|2027|89|98|73|70|83|TOR|2026-27
保罗·乔治|Paul George|13|2027|94|89|85|82|76|BOS|2026-27
斯科蒂·巴恩斯|Scottie Barnes|4|2027|94|91|54|84|83|TOR|2026-27
弗朗茨·瓦格纳|Franz Wagner|22|2027|92|80|63|99|79|ORL|2026-27
保罗·班凯罗|Paolo Banchero|5|2027|99|78|87|94|80|ORL|2026-27
库珀·弗拉格|Cooper Flagg|32|2027|96|92|64|90|81|DAL|2026-27
德尼·阿夫迪亚|Deni Avdija|8|2027|94|78|72|89|79|POR|2026-27`],
['SG', `安东尼·爱德华兹|Anthony Edwards|5|2027|99|90|89|78|73|MIN|2026-27
多诺万·米切尔|Donovan Mitchell|45|2027|98|84|82|87|74|CLE|2026-27
克莱·汤普森|Klay Thompson|11|2027|91|71|88|70|62|MIA|2026-27
CJ·麦科勒姆|CJ McCollum|3|2027|86|80|73|79|67|ATL|2026-27
戴森·丹尼尔斯|Dyson Daniels|5|2027|83|96|42|86|81|ATL|2026-27
杰伦·萨格斯|Jalen Suggs|4|2027|79|87|48|87|74|ORL|2026-27
德里克·怀特|Derrick White|9|2027|90|80|76|84|68|BOS|2026-27
达林·彼得森|Darryn Peterson|22|2027|86|84|75|79|70|UTAH|2026-27
德文·布克|Devin Booker|15|2027|99|78|78|84|66|PHX|2026-27
杰伦·布朗|Jaylen Brown|7|2027|95|85|80|80|79|PHI|2026-27
泰勒·希罗|Tyler Herro|11|2027|96|79|85|82|74|MIL|2026-27
奥斯汀·里夫斯|Austin Reaves|15|2027|99|80|82|83|68|LAL|2026-27
扎克·拉文|Zach LaVine|8|2027|97|79|80|75|68|SAC|2026-27
德斯蒙德·贝恩|Desmond Bane|3|2027|90|82|82|73|70|ORL|2026-27
诺曼·鲍威尔|Norman Powell|24|2027|90|79|73|70|65|CHI|2026-27
杰伦·格林|Jalen Green|4|2027|84|80|58|78|67|PHX|2026-27`]
];
const HISTORY_2K={
PG0:{ovr:99,edition:'2K25',source:'2K25 All-Time',team:'All-Time Los Angeles Lakers',attr:'2K25 All-Time',off:99,def:94,shoot:80,pass:97,reb:84},
PG1:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time Sacramento Kings',attr:'2K25 All-Time',off:92,def:83,shoot:86,pass:95,reb:87},
PG2:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Detroit Pistons',attr:'2K25 All-Time',off:81,def:71,shoot:72,pass:97,reb:46},
PG3:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time Utah Jazz',attr:'2K25 All-Time',off:76,def:89,shoot:86,pass:97,reb:47},
PG4:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Oklahoma City Thunder',attr:'2K25 All-Time',off:80,def:91,shoot:67,pass:92,reb:52},
PG5:{ovr:96,edition:'2K25',source:'2K25 All-Time',team:'All-Time Boston Celtics',attr:'2K25 All-Time',off:84,def:76,shoot:90,pass:96,reb:77},
PG6:{ovr:90,edition:'2K25',source:'2K25 All-Time',team:'All-Time Golden State Warriors',attr:'2K25 All-Time',off:78,def:77,shoot:76,pass:92,reb:49},
PG7:{ovr:93,edition:'2K25',source:'2K25 All-Time',team:'All-Time Cleveland Cavaliers',attr:'2K25 All-Time',off:80,def:59,shoot:93,pass:92,reb:47},
PG8:{ovr:98,edition:'2K25',source:'2K25 All-Time',team:'All-Time Golden State Warriors',attr:'2K25 All-Time',off:84,def:70,shoot:93,pass:94,reb:52},
PG9:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time New Orleans Pelicans',attr:'2K25 All-Time',off:83,def:89,shoot:80,pass:96,reb:51},
PG10:{ovr:96,edition:'2K25',source:'2K25 All-Time',team:'All-Time Phoenix Suns',attr:'2K25 All-Time',off:80,def:71,shoot:90,pass:96,reb:64},
PG11:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Oklahoma City Thunder',attr:'2K25 All-Time',off:88,def:73,shoot:71,pass:95,reb:79},
PG12:{ovr:94,edition:'2K25',source:'2K25 All-Time',team:'All-Time Portland Trail Blazers',attr:'2K25 All-Time',off:85,def:47,shoot:82,pass:92,reb:49},
PG13:{ovr:94,edition:'2K25',source:'2K25 All-Time',team:'All-Time Cleveland Cavaliers',attr:'2K25 All-Time',off:85,def:63,shoot:88,pass:88,reb:54},
PG14:{ovr:96,edition:'2K27',source:'2K27 Current',team:'Los Angeles Lakers',attr:'2K27 Current',off:97,def:51,shoot:82,pass:93,reb:63},
PG15:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Chicago Bulls',attr:'2K25 All-Time',off:88,def:68,shoot:74,pass:94,reb:57},
SG0:{ovr:99,edition:'2K25',source:'2K25 All-Time',team:'All-Time Chicago Bulls',attr:'2K25 All-Time',off:99,def:97,shoot:86,pass:87,reb:63},
SG1:{ovr:96,edition:'2K25',source:'2K25 All-Time',team:'All-Time Portland Trail Blazers',attr:'2K25 All-Time',off:98,def:85,shoot:76,pass:81,reb:79},
SG2:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time Los Angeles Lakers',attr:'2K25 All-Time',off:87,def:86,shoot:89,pass:93,reb:42},
SG3:{ovr:94,edition:'2K25',source:'2K25 All-Time',team:'All-Time San Antonio Spurs',attr:'2K25 All-Time',off:98,def:88,shoot:74,pass:77,reb:88},
SG5:{ovr:93,edition:'2K25',source:'2K25 All-Time',team:'All-Time Detroit Pistons',attr:'2K25 All-Time',off:82,def:86,shoot:84,pass:85,reb:63},
SG6:{ovr:94,edition:'2K25',source:'2K25 All-Time',team:'All-Time Sacramento Kings',attr:'2K25 All-Time',off:94,def:73,shoot:88,pass:82,reb:62},
SG7:{ovr:90,edition:'2K25',source:'2K25 All-Time',team:'All-Time Brooklyn Nets',attr:'2K25 All-Time',off:88,def:71,shoot:94,pass:78,reb:72},
SG8:{ovr:99,edition:'2K25',source:'2K25 All-Time',team:'All-Time Los Angeles Lakers',attr:'2K25 All-Time',off:96,def:88,shoot:83,pass:89,reb:55},
SG9:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time Miami Heat',attr:'2K25 All-Time',off:93,def:91,shoot:75,pass:93,reb:63},
SG10:{ovr:96,edition:'2K21',source:'2K16–2K21 Current',team:'HOU',attr:'2K25 All-Time',off:94,def:73,shoot:78,pass:91,reb:58},
SG11:{ovr:96,edition:'2K25',source:'2K25 All-Time',team:'All-Time Philadelphia 76ers',attr:'2K25 All-Time',off:83,def:77,shoot:77,pass:92,reb:46},
SG12:{ovr:94,edition:'2K25',source:'2K25 All-Time',team:'All-Time Oklahoma City Thunder',attr:'2K25 All-Time',off:93,def:71,shoot:93,pass:83,reb:62},
SG13:{ovr:91,edition:'2K25',source:'2K25 All-Time',team:'All-Time Golden State Warriors',attr:'2K25 All-Time',off:86,def:82,shoot:91,pass:71,reb:48},
SG14:{ovr:92,edition:'2K25',source:'2K25 All-Time',team:'All-Time Phoenix Suns',attr:'2K25 All-Time',off:93,def:59,shoot:82,pass:86,reb:57},
SG15:{ovr:90,edition:'2K25',source:'2K25 All-Time',team:'All-Time San Antonio Spurs',attr:'2K25 All-Time',off:86,def:77,shoot:82,pass:89,reb:62},
SF0:{ovr:99,edition:'2K25',source:'2K25 All-Time',team:'All-Time Boston Celtics',attr:'2K25 All-Time',off:95,def:92,shoot:95,pass:84,reb:76},
SF1:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time Brooklyn Nets',attr:'2K25 All-Time',off:99,def:92,shoot:77,pass:86,reb:78},
SF2:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time Chicago Bulls',attr:'2K25 All-Time',off:93,def:99,shoot:72,pass:85,reb:91},
SF3:{ovr:96,edition:'2K25',source:'2K25 All-Time',team:'All-Time Los Angeles Lakers',attr:'2K25 All-Time',off:99,def:96,shoot:85,pass:82,reb:96},
SF4:{ovr:96,edition:'2K25',source:'2K25 All-Time',team:'All-Time Boston Celtics',attr:'2K25 All-Time',off:95,def:99,shoot:89,pass:84,reb:78},
SF5:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Atlanta Hawks',attr:'2K25 All-Time',off:99,def:86,shoot:73,pass:76,reb:82},
SF6:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Golden State Warriors',attr:'2K25 All-Time',off:99,def:89,shoot:80,pass:83,reb:87},
SF7:{ovr:91,edition:'2K25',source:'2K25 All-Time',team:'All-Time Utah Jazz',attr:'2K25 All-Time',off:99,def:79,shoot:69,pass:82,reb:77},
SF8:{ovr:99,edition:'2K25',source:'2K25 All-Time',team:'All-Time Cleveland Cavaliers',attr:'2K25 All-Time',off:98,def:91,shoot:74,pass:92,reb:70},
SF9:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time Golden State Warriors',attr:'2K25 All-Time',off:99,def:77,shoot:87,pass:84,reb:73},
SF10:{ovr:97,edition:'2K20',source:'2K16–2K21 Current',team:'TOR',attr:'2K25 All-Time',off:96,def:97,shoot:76,pass:84,reb:74},
SF11:{ovr:93,edition:'2K25',source:'2K25 All-Time',team:'All-Time Indiana Pacers',attr:'2K25 All-Time',off:87,def:94,shoot:72,pass:79,reb:63},
SF12:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Orlando Magic',attr:'2K25 All-Time',off:96,def:77,shoot:85,pass:88,reb:54},
SF13:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Denver Nuggets',attr:'2K25 All-Time',off:97,def:80,shoot:84,pass:87,reb:85},
SF14:{ovr:94,edition:'2K25',source:'2K25 All-Time',team:'All-Time Boston Celtics',attr:'2K25 All-Time',off:93,def:83,shoot:85,pass:80,reb:76},
SF15:{ovr:93,edition:'2K25',source:'2K25 All-Time',team:'All-Time Miami Heat',attr:'2K25 All-Time',off:90,def:96,shoot:64,pass:84,reb:65},
PF0:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time Utah Jazz',attr:'2K25 All-Time',off:99,def:92,shoot:76,pass:80,reb:97},
PF2:{ovr:93,edition:'2K25',source:'2K25 All-Time',team:'All-Time Chicago Bulls',attr:'2K25 All-Time',off:79,def:89,shoot:42,pass:59,reb:99},
PF3:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Boston Celtics',attr:'2K25 All-Time',off:97,def:92,shoot:72,pass:58,reb:95},
PF4:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Atlanta Hawks',attr:'2K25 All-Time',off:99,def:80,shoot:90,pass:67,reb:98},
PF5:{ovr:94,edition:'2K25',source:'2K25 All-Time',team:'All-Time Washington Wizards',attr:'2K25 All-Time',off:95,def:97,shoot:53,pass:67,reb:99},
PF6:{ovr:90,edition:'2K25',source:'2K25 All-Time',team:'All-Time Oklahoma City Thunder',attr:'2K25 All-Time',off:89,def:79,shoot:45,pass:54,reb:89},
PF7:{ovr:88,edition:'2K25',source:'2K25 All-Time',team:'All-Time Charlotte Hornets',attr:'2K25 All-Time',off:94,def:68,shoot:76,pass:73,reb:87},
PF8:{ovr:98,edition:'2K25',source:'2K25 All-Time',team:'All-Time San Antonio Spurs',attr:'2K25 All-Time',off:96,def:99,shoot:69,pass:64,reb:96},
PF9:{ovr:98,edition:'2K25',source:'2K25 All-Time',team:'All-Time Minnesota Timberwolves',attr:'2K25 All-Time',off:99,def:88,shoot:67,pass:76,reb:95},
PF10:{ovr:98,edition:'2K25',source:'2K25 All-Time',team:'All-Time Dallas Mavericks',attr:'2K25 All-Time',off:99,def:79,shoot:94,pass:67,reb:92},
PF11:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time Milwaukee Bucks',attr:'2K25 All-Time',off:88,def:96,shoot:46,pass:86,reb:79},
PF12:{ovr:95,edition:'2K21',source:'2K16–2K21 Current',team:'LAL',attr:'2K25 All-Time',off:99,def:92,shoot:65,pass:69,reb:89},
PF13:{ovr:92,edition:'2K25',source:'2K25 All-Time',team:'All-Time Memphis Grizzlies',attr:'2K25 All-Time',off:94,def:80,shoot:65,pass:64,reb:88},
PF14:{ovr:90,edition:'2K25',source:'2K25 All-Time',team:'All-Time Toronto Raptors',attr:'2K25 All-Time',off:96,def:82,shoot:72,pass:61,reb:94},
PF15:{ovr:90,edition:'2K17',source:'2K16–2K21 Current',team:'GSW',attr:'2K25 All-Time',off:76,def:99,shoot:61,pass:82,reb:73},
C0:{ovr:99,edition:'2K25',source:'2K25 All-Time',team:'All-Time Houston Rockets',attr:'2K25 All-Time',off:99,def:97,shoot:65,pass:63,reb:98},
C1:{ovr:99,edition:'2K25',source:'2K25 All-Time',team:'All-Time Milwaukee Bucks',attr:'2K25 All-Time',off:95,def:96,shoot:33,pass:60,reb:99},
C2:{ovr:99,edition:'2K25',source:'2K25 All-Time',team:'All-Time Golden State Warriors',attr:'2K25 All-Time',off:92,def:91,shoot:28,pass:62,reb:99},
C3:{ovr:98,edition:'2K25',source:'2K25 All-Time',team:'All-Time Boston Celtics',attr:'2K25 All-Time',off:83,def:99,shoot:20,pass:66,reb:99},
C4:{ovr:96,edition:'2K25',source:'2K25 All-Time',team:'All-Time San Antonio Spurs',attr:'2K25 All-Time',off:96,def:92,shoot:66,pass:52,reb:89},
C5:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time New York Knicks',attr:'2K25 All-Time',off:99,def:88,shoot:65,pass:57,reb:95},
C6:{ovr:97,edition:'2K25',source:'2K25 All-Time',team:'All-Time Houston Rockets',attr:'2K25 All-Time',off:96,def:97,shoot:36,pass:54,reb:99},
C7:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Portland Trail Blazers',attr:'2K25 All-Time',off:89,def:92,shoot:28,pass:72,reb:99},
C8:{ovr:98,edition:'2K25',source:'2K25 All-Time',team:'All-Time Los Angeles Lakers',attr:'2K25 All-Time',off:84,def:99,shoot:20,pass:62,reb:99},
C9:{ovr:98,edition:'2K25',source:'2K25 Current',team:'Denver Nuggets',attr:'2K25 Current',off:99,def:77,shoot:80,pass:86,reb:90},
C10:{ovr:95,edition:'2K25',source:'2K25 All-Time',team:'All-Time Philadelphia 76ers',attr:'2K25 All-Time',off:98,def:83,shoot:68,pass:71,reb:84},
C11:{ovr:94,edition:'2K25',source:'2K25 All-Time',team:'All-Time Orlando Magic',attr:'2K25 All-Time',off:81,def:99,shoot:20,pass:48,reb:98},
C12:{ovr:91,edition:'2K25',source:'2K25 All-Time',team:'All-Time Houston Rockets',attr:'2K25 All-Time',off:89,def:80,shoot:45,pass:51,reb:98},
C13:{ovr:89,edition:'2K25',source:'2K25 All-Time',team:'All-Time Detroit Pistons',attr:'2K25 All-Time',off:59,def:99,shoot:20,pass:49,reb:86},
C14:{ovr:93,edition:'2K25',source:'2K25 All-Time',team:'All-Time Memphis Grizzlies',attr:'2K25 All-Time',off:99,def:89,shoot:82,pass:62,reb:87},
C15:{ovr:94,edition:'2K25',source:'2K25 All-Time',team:'All-Time Miami Heat',attr:'2K25 All-Time',off:96,def:99,shoot:54,pass:46,reb:95}
};
const HISTORY_MANUAL={
SG4:{source:'人工回退 — 可用 2K 数据集未覆盖',off:90,def:73,shoot:97,pass:66,reb:45},
PF1:{source:'人工回退 — 可用 2K 数据集未覆盖',off:96,def:72,shoot:65,pass:84,reb:99}
};
export const POSITIONS = [{id:'PG',name:'控球后卫',n:1},{id:'SG',name:'得分后卫',n:2},{id:'SF',name:'小前锋',n:3},{id:'PF',name:'大前锋',n:4},{id:'C',name:'中锋',n:5}];
function build(rows,pool){
  return rows.flatMap(([pos,text])=>text.split('\n').map((line,i)=>{
    const [name,en,num,year,off,def,shoot,pass,reb,team,season]=line.split('|');
    const id=(pool==='active'?'A-':'')+pos+i;
    const twoK=pool==='history'?HISTORY_2K[id]:null;
    const manual=pool==='history'?HISTORY_MANUAL[id]:null;
    const selected=twoK||manual;
    const r=selected?{off:selected.off,def:selected.def,shoot:selected.shoot,pass:selected.pass,reb:selected.reb}:{off:+off,def:+def,shoot:+shoot,pass:+pass,reb:+reb};
    const gameOvr=Math.round(r.off*.42+r.def*.29+Math.max(r.shoot,r.pass,r.reb)*.29);
    return {
      id,photo:PLAYER_PHOTOS[id],pool,pos,name,en,num,year:+year,season:season||String(year),team:team||'',
      peak:pool==='history',
      ratingBasis:pool==='history'?(twoK?'2k-highest-overall':'manual-fallback'):'2026-27',
      ratingSource:pool==='history'?(twoK?twoK.source:manual.source):'ESPN 2026-27',
      ratingEdition:pool==='history'?(twoK?twoK.edition:'MANUAL'):'2026-27',
      ratingTeam:pool==='history'?(twoK?twoK.team:''):(team||''),
      attributeEdition:pool==='history'?(twoK?twoK.attr:'Manual'):'2026-27',
      ovr2k:twoK?twoK.ovr:null,
      ovr:pool==='history'?(twoK?twoK.ovr:gameOvr):gameOvr,
      gameOvr,
      off:r.off,def:r.def,shoot:r.shoot,pass:r.pass,reb:r.reb
    };
  }));
}
export const PLAYERS=[...build(historyRaw,'history'),...build(activeRaw,'active')];
export const MODES={active:'现役球星 · 2026–27',history:'历史巅峰 · 2K最高总评'};
