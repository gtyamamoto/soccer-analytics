const puppeteer = require("puppeteer");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;


const years = [2014, 2015, 2016, 2017, 2018, 2019];
const leagues = [
  { leagueName: "championship", leagueCode: "GB2" },
  { leagueName: "premiere", leagueCode: "GB1" },
];
const csvWriter = createCsvWriter({
  path: `dadosCrawlerTransferencias${years.join('')}.csv`,
  header: [
    { id: "player", title: "Nome do Jogador" },
    { id: "player_age", title: "Idade do Jogador" },
    { id: "player_nationality", title: "Nacionalidade do Jogador" },
    { id: "player_position", title: "Posicao" },
    { id: "player_market_value", title: "Valor de Mercado" },
    { id: "club_destination", title: "Clube (Origem/Destino)" },
    {id:'movement',title:'entrada/saida'},
    { id: "fee", title: "Valor da Transferencia" },
    { id: "club", title: "Clube" },
    { id: "year", title: "Temporada" },
    { id: "league", title: "Liga" },
  ],
});


// main function

(async () => {
  const start = new Date();
  const browser = await puppeteer.launch();
    for (let league of leagues) {
      const data = await Promise.all(years.map(year=>crawlForDataByLeagueAndYear(browser, league, year)));
      await csvWriter.writeRecords([].concat.apply([], data));
      console.log(`Data for league ${league.leagueName} was written successfully`);
    }
  console.log(`Time passed: ${(new Date()) - start} ms`)
  await browser.close();
})();
  




// codigo crawler para pegar transferencias
  async function crawlForDataByLeagueAndYear (browser, league, year) {
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);
  await page.goto(
    `https://www.transfermarkt.co.uk/${league.leagueName}/transfers/wettbewerb/${league.leagueCode}/saison_id/${year}`
  );
  const result = await page.evaluate((year,league) => {
   //convert pound sterling to float
   const pipePoundToFloat = (pound)=>{
     if(!pound.startsWith('£')) return pound;
     return pound.endsWith('Th.') ? Number(pound.replace(/[^0-9\.]+/g,""))*1000 :
      Number(pound.replace(/[^0-9\.]+/g,""))*1000000
   }
    const mapperTransfer = (clubName,year,league,movement)=>  (transfer)=> {
      return {
        club:clubName,
        player: transfer.querySelector(".spielprofil_tooltip").text,
        player_age: transfer.querySelector(".alter-transfer-cell").textContent,
        player_nationality: transfer.querySelector(".nat-transfer-cell img").title,
        player_position: transfer.querySelector(".pos-transfer-cell").textContent,
        player_market_value: pipePoundToFloat(transfer.querySelector(".mw-transfer-cell")
          .textContent),
        club_destination: transfer
          .querySelector(".verein-flagge-transfer-cell")
          .textContent.trim(),
        fee: pipePoundToFloat(transfer.querySelector(".rechts a").textContent),
        year,
        league:league.leagueName,
        movement
      };
    } 
    return Array.from(
      document.querySelectorAll('.table-header[id^="to-"]')
    ).map((club) => {
      const clubName =  club.querySelector("h2 a").text ;
      const dataset = document.querySelectorAll(
        `#${club.id} ~ .responsive-table`
      );
      const incomes = Array.from(dataset[0].querySelectorAll("tbody tr"))
        .map(mapperTransfer(clubName,year,league,'in'))
      const outcomes = Array.from(dataset[1].querySelectorAll("tbody tr"))
      .map(mapperTransfer(clubName,year,league,'out'))
      return [...incomes, ...outcomes];
    });
  },year,league);
  return [].concat
    .apply([], result)
};
