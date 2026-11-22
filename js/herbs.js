// Medicinal herb data.
// likelihood: high = common in suitable habitat, medium = occasional / local,
//             low = rare, scattered, endangered or only as garden escapes.
// evidence:   "traditional" = traditional use only,
//             "some" = some clinical studies, results mixed or small,
//             "good" = several good-quality clinical trials.
// season:     months (1-12) when the plant is typically found / harvested.
window.HERBS = [
  {
    id: "chamomile",
    name: "German Chamomile",
    latin: "Matricaria chamomilla",
    family: "Asteraceae",
    uses: ["Digestion", "Sleep & calm", "Skin & wounds"],
    parts: "Flower heads",
    habitat: "Fields, roadsides, waste ground and sandy disturbed soils.",
    season: [5, 6, 7, 8],
    evidence: "some",
    properties: "Calming and mildly antispasmodic. Tea is widely used for indigestion, bloating, cramps and to ease sleep. Small trials suggest benefit for mild anxiety. Applied as a compress or rinse it soothes inflamed skin and mouth irritation.",
    preparation: "Infusion of 1–2 tsp dried flowers per cup, steeped 5–10 min, covered.",
    cautions: "Can trigger allergy in people sensitive to the daisy family (ragweed, arnica). May interact with blood thinners.",
    lookalikes: "Scentless mayweed and dog fennel look similar; true chamomile has a hollow, cone-shaped flower base and a sweet apple scent.",
    ranges: {
      high: ["europeTemperate", "mediterranean"],
      medium: ["eastEurope", "westAsia"],
      low: ["naEast", "naWest", "australiaSE", "southAmericaSouth"]
    }
  },
  {
    id: "yarrow",
    name: "Yarrow",
    latin: "Achillea millefolium",
    family: "Asteraceae",
    uses: ["Skin & wounds", "Digestion", "Immune & colds"],
    parts: "Flowering tops, leaves",
    habitat: "Meadows, pastures, verges and lawns from lowlands to mountains.",
    season: [6, 7, 8, 9],
    evidence: "traditional",
    properties: "Named after Achilles, who supposedly used it on soldiers' wounds. Traditionally applied to stop minor bleeding, taken as a bitter tea for poor appetite and cramps, and used as a hot tea to promote sweating during colds and fevers.",
    preparation: "Infusion of 1–2 tsp dried herb per cup; fresh crushed leaf on small cuts.",
    cautions: "Avoid in pregnancy. Daisy-family allergy possible. Can increase sun sensitivity.",
    lookalikes: "Can be confused with poisonous members of the carrot family (hemlock, water hemlock). Yarrow has feathery, finely divided leaves and a fuzzy stem.",
    ranges: {
      high: ["europeTemperate", "scandinavia", "alps", "naWest", "canadaBoreal"],
      medium: ["naEast", "siberia", "eastEurope", "westAsia", "neAsia", "carpathians"],
      low: ["australiaSE", "newZealand", "southAmericaSouth", "himalaya"]
    }
  },
  {
    id: "stjohnswort",
    name: "St John's Wort",
    latin: "Hypericum perforatum",
    family: "Hypericaceae",
    uses: ["Mood", "Skin & wounds", "Pain & inflammation"],
    parts: "Flowering tops",
    habitat: "Sunny dry grassland, woodland edges, roadsides and clearings.",
    season: [6, 7, 8],
    evidence: "good",
    properties: "One of the best-studied herbs: standardised extracts perform better than placebo, and comparably to some antidepressants, for mild to moderate depression. The red infused oil is used traditionally on burns, bruises and nerve pain.",
    preparation: "Standardised extracts are preferred for mood. Oil: fresh flowers infused in olive oil in sunlight for several weeks until red.",
    cautions: "Serious drug interactions: it reduces the effect of birth control pills, anticoagulants, HIV and transplant drugs and many others, and can cause serotonin syndrome with antidepressants. Causes photosensitivity. Consult a doctor before use.",
    lookalikes: "Hold a leaf to the light: true St John's wort shows tiny translucent dots, and the yellow petals stain fingers red when crushed.",
    ranges: {
      high: ["europeTemperate", "mediterranean"],
      medium: ["westAsia", "naWest", "naEast", "australiaSE", "centralAsia"],
      low: ["eastEurope", "southAmericaSouth", "newZealand", "northAfrica"]
    }
  },
  {
    id: "nettle",
    name: "Stinging Nettle",
    latin: "Urtica dioica",
    family: "Urticaceae",
    uses: ["Pain & inflammation", "Urinary", "Respiratory"],
    parts: "Young leaves, roots, seeds",
    habitat: "Nitrogen-rich soil: woodland edges, riverbanks, farmyards and gardens.",
    season: [3, 4, 5, 6, 7, 8, 9],
    evidence: "some",
    properties: "Nutritious spring green rich in minerals. Root extracts are used for symptoms of an enlarged prostate, with reasonable trial support. Leaf tea is a traditional diuretic, and leaf preparations are used for joint pain and hay fever (evidence modest).",
    preparation: "Young tops cooked as a vegetable or tea; wear gloves when picking. Cooking or drying removes the sting.",
    cautions: "May interact with blood pressure, diabetes and blood-thinning medication and with diuretics. Do not eat old plants in late summer raw.",
    lookalikes: "Dead-nettles look similar but don't sting and have no medicinal equivalence.",
    ranges: {
      high: ["europeTemperate", "scandinavia", "eastEurope", "alps", "carpathians"],
      medium: ["naEast", "naWest", "canadaBoreal", "siberia", "westAsia", "himalaya", "pyrenees"],
      low: ["northAfrica", "southAmericaSouth", "australiaSE", "andes"]
    }
  },
  {
    id: "dandelion",
    name: "Dandelion",
    latin: "Taraxacum officinale",
    family: "Asteraceae",
    uses: ["Digestion", "Urinary"],
    parts: "Leaves, roots, flowers",
    habitat: "Practically everywhere: lawns, meadows, roadsides and cracks in pavements.",
    season: [3, 4, 5, 6, 7, 8, 9, 10],
    evidence: "traditional",
    properties: "Bitter leaves stimulate appetite and digestion and act as a mild diuretic. The roasted root is a coffee substitute and a traditional liver and bile tonic. Leaves are rich in vitamins A, C and K and potassium.",
    preparation: "Young leaves in salads; root decoction (simmered 10–15 min); flowers for syrup.",
    cautions: "Avoid with bile-duct obstruction or gallstones without medical advice. Daisy-family allergy possible. Do not pick near sprayed roads or lawns.",
    lookalikes: "Cat's-ear and hawkbits look similar and are also edible.",
    ranges: {
      high: ["europeTemperate", "scandinavia", "eastEurope", "alps", "naEast", "naWest", "canadaBoreal"],
      medium: ["mediterranean", "siberia", "westAsia", "eastAsia", "southAmericaSouth", "australiaSE", "newZealand", "carpathians"],
      low: ["himalaya", "cape", "andes", "northAfrica", "centralAsia"]
    }
  },
  {
    id: "lavender",
    name: "True Lavender",
    latin: "Lavandula angustifolia",
    family: "Lamiaceae",
    uses: ["Sleep & calm", "Mood", "Skin & wounds"],
    parts: "Flower spikes, essential oil",
    habitat: "Dry, stony, sunny limestone slopes at 500–1800 m.",
    season: [6, 7, 8],
    evidence: "some",
    properties: "A standardised oral lavender oil (Silexan) has shown benefit for generalised anxiety in several trials. Inhaled aroma is used for relaxation and sleep. Diluted oil is antiseptic for small burns, bites and stings.",
    preparation: "Infusion of 1 tsp flowers per cup, sachets, or a few drops of diluted oil.",
    cautions: "Do not swallow undiluted essential oil. May add to the effect of sedatives. Can irritate sensitive skin.",
    lookalikes: "Easily identified by scent; wild plants are mostly in southern France, Spain and Italy — elsewhere they are garden escapes.",
    ranges: {
      high: ["provence"],
      medium: ["westMed"],
      low: ["mediterranean", "europeTemperate"]
    }
  },
  {
    id: "arnica",
    name: "Arnica",
    latin: "Arnica montana",
    family: "Asteraceae",
    uses: ["Pain & inflammation", "Skin & wounds"],
    parts: "Flower heads",
    habitat: "Acidic, nutrient-poor mountain meadows and heaths, mostly 1000–2500 m.",
    season: [6, 7, 8],
    evidence: "some",
    properties: "Arnica gels and ointments are used for bruises, sprains and muscle soreness; some trials found arnica gel comparable to ibuprofen gel for hand osteoarthritis. (Homeopathic arnica is a different matter and lacks evidence.)",
    preparation: "Topical only: gel, ointment or a tincture diluted for compresses.",
    cautions: "POISONOUS if taken internally. Never use on broken skin. Protected in many countries — do not pick wild plants; buy cultivated products.",
    lookalikes: "Leopard's bane and some hawkweeds look similar; arnica has opposite leaves in a basal rosette.",
    ranges: {
      high: ["alps"],
      medium: ["carpathians", "pyrenees"],
      low: ["europeTemperate", "scandinavia"]
    }
  },
  {
    id: "valerian",
    name: "Valerian",
    latin: "Valeriana officinalis",
    family: "Caprifoliaceae",
    uses: ["Sleep & calm"],
    parts: "Root",
    habitat: "Damp meadows, fens, ditches, stream banks and woodland edges.",
    season: [6, 7, 8, 9, 10],
    evidence: "some",
    properties: "The root has been used as a sleep aid since ancient Greece. Studies are mixed: some show faster sleep onset and better sleep quality after a few weeks of use, others show no difference to placebo. Often combined with hops or lemon balm.",
    preparation: "Root tea or tincture 30–60 min before bed. Roots are dug in autumn. Smells strongly of old socks.",
    cautions: "Can cause drowsiness — do not drive. Avoid with alcohol or sedatives, in pregnancy and with liver problems.",
    lookalikes: "Young plants can be confused with water hemlock (deadly) in wet habitats. Be certain of identification before digging roots.",
    ranges: {
      high: ["europeTemperate"],
      medium: ["scandinavia", "eastEurope", "siberia", "westAsia", "alps"],
      low: ["naEast", "canadaBoreal", "mediterranean"]
    }
  },
  {
    id: "thyme",
    name: "Common Thyme",
    latin: "Thymus vulgaris",
    family: "Lamiaceae",
    uses: ["Respiratory", "Immune & colds", "Digestion"],
    parts: "Leaves and flowering tops",
    habitat: "Dry rocky garrigue and scrubland in full sun.",
    season: [5, 6, 7, 8],
    evidence: "some",
    properties: "Thymol, its main compound, is strongly antiseptic. Thyme extracts (often with ivy or primrose) are approved in Europe for coughs from bronchitis and colds, and trials support shorter coughing duration. Also eases digestion and bloating.",
    preparation: "Infusion of 1–2 tsp per cup; honey-thyme syrup for coughs; steam inhalation.",
    cautions: "Generally safe in culinary amounts. Essential oil must be diluted and kept away from small children. Avoid large doses in pregnancy.",
    lookalikes: "Wild thyme (Thymus serpyllum), common in northern Europe, has similar uses.",
    ranges: {
      high: ["westMed"],
      medium: ["mediterranean"],
      low: ["northAfrica"]
    }
  },
  {
    id: "echinacea",
    name: "Purple Coneflower",
    latin: "Echinacea purpurea / E. angustifolia",
    family: "Asteraceae",
    uses: ["Immune & colds"],
    parts: "Roots, flowering tops",
    habitat: "Open woodland, prairies and glades.",
    season: [6, 7, 8, 9],
    evidence: "some",
    properties: "Used by Plains peoples for wounds, infections and snakebite. Today taken at the first sign of a cold; meta-analyses suggest a modest reduction in risk and duration of colds, though results depend heavily on the preparation.",
    preparation: "Tincture or pressed juice taken for up to 10 days at onset of symptoms.",
    cautions: "Daisy-family allergy. Avoid with autoimmune diseases or immunosuppressants. Wild populations are over-harvested — use cultivated plants.",
    lookalikes: "Other coneflowers (Rudbeckia) have yellow petals.",
    ranges: {
      high: [],
      medium: ["ozarksMidwest", "naPrairie"],
      low: ["naEast"]
    }
  },
  {
    id: "lemonbalm",
    name: "Lemon Balm",
    latin: "Melissa officinalis",
    family: "Lamiaceae",
    uses: ["Sleep & calm", "Digestion", "Skin & wounds"],
    parts: "Leaves",
    habitat: "Scrub, field edges and old gardens; widely naturalised.",
    season: [5, 6, 7, 8, 9],
    evidence: "some",
    properties: "Gently calming with a lemony scent. Small trials suggest improved mood, calmness and sleep, especially combined with valerian. Creams with lemon balm extract can shorten cold-sore outbreaks. Soothes nervous indigestion.",
    preparation: "Fresh or dried leaf infusion; best used fresh.",
    cautions: "May interact with thyroid medication and sedatives.",
    lookalikes: "Other mints look similar but lack the distinct lemon scent.",
    ranges: {
      high: [],
      medium: ["mediterranean", "westAsia"],
      low: ["europeTemperate", "naEast", "naWest", "northAfrica"]
    }
  },
  {
    id: "elder",
    name: "Elder",
    latin: "Sambucus nigra",
    family: "Adoxaceae",
    uses: ["Immune & colds", "Respiratory"],
    parts: "Flowers, ripe cooked berries",
    habitat: "Hedgerows, woodland edges, river banks and waste ground.",
    season: [5, 6, 8, 9, 10],
    evidence: "some",
    properties: "Elderflower tea promotes sweating during feverish colds. Elderberry syrup has shown shorter flu and cold duration in a few small trials. Berries are rich in anthocyanins and vitamin C.",
    preparation: "Flowers as tea or cordial (May–June); berries only cooked as syrup (Aug–Oct).",
    cautions: "Raw berries, leaves, bark and unripe berries contain compounds that cause nausea and vomiting — always cook the berries.",
    lookalikes: "Dwarf elder (Sambucus ebulus) is poisonous: it is a non-woody plant with upright berry clusters. Also avoid water hemlock-like umbellifers.",
    ranges: {
      high: ["europeTemperate"],
      medium: ["mediterranean", "northAfrica", "westAsia", "naEast"],
      low: ["scandinavia", "naWest", "australiaSE", "newZealand"]
    }
  },
  {
    id: "plantain",
    name: "Ribwort & Broadleaf Plantain",
    latin: "Plantago lanceolata / P. major",
    family: "Plantaginaceae",
    uses: ["Skin & wounds", "Respiratory"],
    parts: "Leaves, seeds",
    habitat: "Lawns, paths, meadows and trampled ground — a classic \"footstep\" weed.",
    season: [4, 5, 6, 7, 8, 9, 10],
    evidence: "traditional",
    properties: "The crushed leaf is a classic field remedy for insect stings, nettle stings and small wounds — it is soothing and mildly antimicrobial. Ribwort syrup is approved traditionally in Europe for dry, irritating cough.",
    preparation: "\"Spit poultice\": chew or crush a fresh leaf and apply. Syrup or tea for coughs.",
    cautions: "Very safe. Pollen can cause hay fever.",
    lookalikes: "Easy to identify by its parallel leaf veins.",
    ranges: {
      high: ["europeTemperate", "naEast", "naWest", "eastAsia", "scandinavia", "eastEurope"],
      medium: ["mediterranean", "westAsia", "siberia", "southAmericaSouth", "australiaSE", "newZealand", "canadaBoreal", "alps"],
      low: ["northAfrica", "himalaya", "andes", "cape", "india", "mexicoCentralAm"]
    }
  },
  {
    id: "wildgarlic",
    name: "Wild Garlic (Ramsons)",
    latin: "Allium ursinum",
    family: "Amaryllidaceae",
    uses: ["Circulation & heart", "Digestion"],
    parts: "Leaves, flowers",
    habitat: "Damp, shady deciduous woodlands, often in large carpets.",
    season: [3, 4, 5],
    evidence: "traditional",
    properties: "Like garlic, it contains sulphur compounds traditionally used to support healthy blood pressure and cholesterol and for digestive infections. Eaten as a spring tonic, mostly as food.",
    preparation: "Fresh leaves in pesto, soups or salads before flowering.",
    cautions: "Deadly lookalikes! Many poisonings every year.",
    lookalikes: "Lily of the valley, autumn crocus and young arum leaves are highly poisonous. Pick leaf by leaf and crush each one — only wild garlic smells strongly of garlic (but beware garlic-smelling fingers).",
    ranges: {
      high: ["europeTemperate"],
      medium: ["alps", "carpathians", "eastEurope"],
      low: ["westAsia", "scandinavia", "pyrenees"]
    }
  },
  {
    id: "marshmallow",
    name: "Marshmallow",
    latin: "Althaea officinalis",
    family: "Malvaceae",
    uses: ["Respiratory", "Digestion"],
    parts: "Root, leaves",
    habitat: "Salt marshes, damp meadows and riverbanks, often near the coast.",
    season: [7, 8, 9, 10],
    evidence: "traditional",
    properties: "Its rich mucilage coats and soothes irritated mucous membranes — used for dry cough, sore throat and mild gastritis. Officially recognised in Europe as a traditional remedy for these uses.",
    preparation: "Cold infusion of the root (soak 1–2 h in cold water) preserves mucilage.",
    cautions: "Take other medicines 1 hour apart, as the mucilage can slow their absorption.",
    lookalikes: "Common mallow is similar and has milder, comparable properties.",
    ranges: {
      high: [],
      medium: ["mediterranean", "westAsia", "centralAsia"],
      low: ["europeTemperate", "eastEurope", "naEast"]
    }
  },
  {
    id: "ginseng",
    name: "Ginseng",
    latin: "Panax ginseng / P. quinquefolius",
    family: "Araliaceae",
    uses: ["Energy & stress", "Immune & colds"],
    parts: "Root (several years old)",
    habitat: "Cool, shady, old-growth hardwood forests on rich, moist soil.",
    season: [8, 9, 10],
    evidence: "some",
    properties: "Revered in East Asian medicine as an adaptogen. Studies suggest modest benefits for fatigue, mental performance and blood sugar control; American ginseng may reduce the frequency of colds.",
    preparation: "Usually bought as dried root, extract or tea from cultivated sources.",
    cautions: "Wild ginseng is endangered and protected (CITES) — do not harvest. May cause insomnia and interacts with blood thinners, diabetes drugs and MAOIs.",
    lookalikes: "Virginia creeper and young buckeye seedlings have similar five-part leaves.",
    ranges: {
      high: [],
      medium: [],
      low: ["neAsia", "appalachia", "naEast"]
    }
  },
  {
    id: "ashwagandha",
    name: "Ashwagandha",
    latin: "Withania somnifera",
    family: "Solanaceae",
    uses: ["Energy & stress", "Sleep & calm"],
    parts: "Root, leaves",
    habitat: "Dry, stony, disturbed ground and semi-desert scrub.",
    season: [9, 10, 11, 12, 1, 2],
    evidence: "some",
    properties: "A cornerstone of Ayurveda used as a rejuvenating tonic. Several small trials show reduced stress, cortisol and anxiety scores and improved sleep, though larger studies are needed.",
    preparation: "Root powder in warm milk or as standardised extract.",
    cautions: "Avoid in pregnancy and with thyroid, autoimmune or liver conditions; rare cases of liver injury reported. A member of the nightshade family.",
    lookalikes: "Other nightshades (some poisonous) look similar; the papery lantern around the red berry is characteristic.",
    ranges: {
      high: [],
      medium: ["india", "arabia", "northAfrica"],
      low: ["mediterranean", "eastAfrica", "kalahari", "westAsia"]
    }
  },
  {
    id: "tulsi",
    name: "Holy Basil (Tulsi)",
    latin: "Ocimum tenuiflorum",
    family: "Lamiaceae",
    uses: ["Energy & stress", "Respiratory", "Immune & colds"],
    parts: "Leaves",
    habitat: "Warm, sunny places; grows wild and around temples and homes.",
    season: [6, 7, 8, 9, 10, 11],
    evidence: "some",
    properties: "Sacred in Hinduism and used in Ayurveda for coughs, colds, stress and blood sugar. Small human studies suggest improvements in stress and metabolic markers.",
    preparation: "Fresh or dried leaf tea.",
    cautions: "May lower blood sugar and slow blood clotting. Avoid when trying to conceive or in pregnancy.",
    lookalikes: "Related to culinary basil, which has larger, glossier leaves.",
    ranges: {
      high: ["india"],
      medium: ["southeastAsia"],
      low: ["arabia", "eastAfrica"]
    }
  },
  {
    id: "teatree",
    name: "Tea Tree",
    latin: "Melaleuca alternifolia",
    family: "Myrtaceae",
    uses: ["Skin & wounds"],
    parts: "Leaves (essential oil)",
    habitat: "Swampy flats and stream banks along the coast.",
    season: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    evidence: "some",
    properties: "Bundjalung people used crushed leaves for coughs, colds and wounds. The essential oil is strongly antimicrobial and antifungal; trials show 5% gel helps mild acne, and it is used for athlete's foot and nail fungus.",
    preparation: "Diluted essential oil (usually 5–10%) applied to skin.",
    cautions: "Toxic if swallowed. Can cause contact dermatitis, especially old, oxidised oil.",
    lookalikes: "Many other Melaleuca (paperbark) species grow in the same area.",
    ranges: {
      high: ["northernRivers"],
      medium: [],
      low: ["australiaSE"]
    }
  },
  {
    id: "devilsclaw",
    name: "Devil's Claw",
    latin: "Harpagophytum procumbens",
    family: "Pedaliaceae",
    uses: ["Pain & inflammation"],
    parts: "Secondary storage tubers",
    habitat: "Red Kalahari sands and savanna.",
    season: [3, 4, 5, 6],
    evidence: "some",
    properties: "Used by San and Khoi peoples for pain, fever and digestive complaints. Trials suggest it can reduce lower-back pain and osteoarthritis pain, with effects comparable to some standard treatments.",
    preparation: "Standardised extracts or tea from dried tuber.",
    cautions: "Avoid with stomach ulcers, gallstones and in pregnancy. May interact with blood thinners and heart medication.",
    lookalikes: "Named after its hooked, claw-like fruit.",
    ranges: {
      high: [],
      medium: ["kalahari"],
      low: []
    }
  },
  {
    id: "catsclaw",
    name: "Cat's Claw (Uña de gato)",
    latin: "Uncaria tomentosa",
    family: "Rubiaceae",
    uses: ["Pain & inflammation", "Immune & colds"],
    parts: "Inner bark, root",
    habitat: "Climbing vine in tropical rainforest.",
    season: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    evidence: "traditional",
    properties: "Used by Asháninka and other Amazonian peoples for inflammation, wounds and digestive problems. Preliminary studies suggest anti-inflammatory effects in arthritis.",
    preparation: "Decoction of the bark or capsules.",
    cautions: "Avoid in pregnancy, with autoimmune diseases, before surgery and with immunosuppressant or blood pressure drugs.",
    lookalikes: "Named for its curved thorns; Uncaria guianensis is similar.",
    ranges: {
      high: [],
      medium: ["amazon"],
      low: ["andes", "mexicoCentralAm"]
    }
  },
  {
    id: "aloe",
    name: "Aloe Vera",
    latin: "Aloe vera",
    family: "Asphodelaceae",
    uses: ["Skin & wounds", "Digestion"],
    parts: "Inner leaf gel",
    habitat: "Arid, rocky and sandy ground in hot climates.",
    season: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    evidence: "some",
    properties: "The clear inner gel soothes and cools sunburn, minor burns and skin irritation, and trials suggest it can speed healing of mild burns. Gel drinks are also used for mild digestive complaints.",
    preparation: "Split a leaf and apply the clear gel directly.",
    cautions: "The yellow latex just under the skin is a strong laxative — avoid taking it internally. Avoid oral use in pregnancy.",
    lookalikes: "Agaves look similar but have fibrous, non-gel leaves; many other aloes grow wild in southern Africa.",
    ranges: {
      high: [],
      medium: ["arabia"],
      low: ["northAfrica", "mediterranean", "mexicoCentralAm", "india", "cape"]
    }
  },
  {
    id: "feverfew",
    name: "Feverfew",
    latin: "Tanacetum parthenium",
    family: "Asteraceae",
    uses: ["Pain & inflammation"],
    parts: "Leaves",
    habitat: "Walls, rocky places, roadsides and old gardens.",
    season: [6, 7, 8, 9],
    evidence: "some",
    properties: "Taken daily, feverfew may reduce the frequency of migraines in some people, though trial results are mixed. Traditionally used for fevers and arthritis.",
    preparation: "1–2 fresh leaves daily (often in bread to mask bitterness) or capsules.",
    cautions: "Can cause mouth ulcers. Avoid in pregnancy and with blood thinners. Stop gradually to avoid rebound headaches.",
    lookalikes: "Resembles chamomile, but has flat flower centres and a bitter, pungent smell.",
    ranges: {
      high: [],
      medium: ["westAsia", "mediterranean"],
      low: ["europeTemperate", "naEast", "naWest", "southAmericaSouth"]
    }
  },
  {
    id: "comfrey",
    name: "Comfrey",
    latin: "Symphytum officinale",
    family: "Boraginaceae",
    uses: ["Pain & inflammation", "Skin & wounds"],
    parts: "Root, leaves (external use)",
    habitat: "Damp ground along rivers, ditches and wet meadows.",
    season: [5, 6, 7, 8, 9],
    evidence: "some",
    properties: "Called \"knitbone\": its allantoin promotes tissue repair. Several good trials show comfrey root ointment reduces pain and swelling of sprains, bruises and back pain.",
    preparation: "External only — ointments, poultices of mashed fresh root or leaves.",
    cautions: "Contains liver-toxic pyrrolizidine alkaloids — do not eat or drink. Do not use on broken skin or for long periods.",
    lookalikes: "Young leaves resemble foxglove (deadly poisonous). Comfrey leaves are rough and hairy, foxglove are soft and downy.",
    ranges: {
      high: ["europeTemperate"],
      medium: ["eastEurope", "westAsia", "carpathians"],
      low: ["naEast", "naWest", "scandinavia", "newZealand"]
    }
  },
  {
    id: "licorice",
    name: "Licorice",
    latin: "Glycyrrhiza glabra",
    family: "Fabaceae",
    uses: ["Respiratory", "Digestion"],
    parts: "Root",
    habitat: "Riverbanks, floodplains and moist steppe in warm climates.",
    season: [9, 10, 11],
    evidence: "some",
    properties: "Soothing and expectorant for coughs and sore throat; used for stomach ulcers and heartburn (often as deglycyrrhizinated licorice, DGL). Around 50 times sweeter than sugar.",
    preparation: "Root decoction or chewing the dried root.",
    cautions: "Regular use can raise blood pressure and lower potassium. Avoid with heart, kidney or blood pressure problems and in pregnancy. Limit to a few weeks.",
    lookalikes: "Other legumes; recognised by its sweet root.",
    ranges: {
      high: [],
      medium: ["mediterranean", "westAsia", "centralAsia"],
      low: ["eastEurope", "northAfrica"]
    }
  },
  {
    id: "rosemary",
    name: "Rosemary",
    latin: "Salvia rosmarinus",
    family: "Lamiaceae",
    uses: ["Digestion", "Circulation & heart", "Mood"],
    parts: "Leaves",
    habitat: "Dry coastal scrub and rocky hillsides.",
    season: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    evidence: "traditional",
    properties: "Traditionally used for indigestion, poor circulation, low energy and memory (\"rosemary for remembrance\"). Rubbed on the skin as an oil or liniment for muscle pain. Small studies suggest the aroma may support alertness.",
    preparation: "Tea from leaves; in cooking; diluted oil for massage.",
    cautions: "Safe in food amounts. Avoid medicinal doses in pregnancy and with epilepsy.",
    lookalikes: "Distinctive needle-like, aromatic leaves.",
    ranges: {
      high: ["westMed"],
      medium: ["mediterranean", "northAfrica"],
      low: ["westAsia"]
    }
  },
  {
    id: "sage",
    name: "Common Sage",
    latin: "Salvia officinalis",
    family: "Lamiaceae",
    uses: ["Respiratory", "Women's health", "Digestion"],
    parts: "Leaves",
    habitat: "Dry, rocky limestone slopes, especially along the Adriatic coast.",
    season: [5, 6, 7, 8, 9],
    evidence: "some",
    properties: "Sage gargles and sprays soothe sore throats (supported by trials). Taken internally it can reduce excessive sweating and hot flushes in menopause. Its Latin name comes from salvare — to heal.",
    preparation: "Tea for sweating; stronger infusion as a gargle.",
    cautions: "Contains thujone — avoid high doses or long-term use, in pregnancy and breastfeeding, and with epilepsy.",
    lookalikes: "Clary sage and meadow sage are relatives with different properties.",
    ranges: {
      high: [],
      medium: ["mediterranean"],
      low: ["europeTemperate", "westMed"]
    }
  },
  {
    id: "bilberry",
    name: "Bilberry",
    latin: "Vaccinium myrtillus",
    family: "Ericaceae",
    uses: ["Digestion", "Circulation & heart"],
    parts: "Berries, leaves",
    habitat: "Acidic heaths, moors and coniferous forests, often in mountains.",
    season: [7, 8, 9],
    evidence: "some",
    properties: "Dried berries are a traditional remedy for diarrhoea, and the berries are rich in anthocyanins, studied for eye health and blood vessel support. Fresh berries are mildly laxative, dried ones constipating.",
    preparation: "Dried berries chewed or as a decoction; fresh berries as food.",
    cautions: "Leaves should not be used long term. Berries are safe as food.",
    lookalikes: "Bog bilberry and poisonous berries such as deadly nightshade are different — learn the plant well.",
    ranges: {
      high: ["scandinavia", "alps", "carpathians"],
      medium: ["europeTemperate", "siberia", "eastEurope", "pyrenees"],
      low: ["westAsia", "canadaBoreal", "naWest"]
    }
  },
  {
    id: "rosehip",
    name: "Dog Rose (Rosehip)",
    latin: "Rosa canina",
    family: "Rosaceae",
    uses: ["Immune & colds", "Pain & inflammation"],
    parts: "Ripe hips",
    habitat: "Hedgerows, woodland edges, scrub and roadsides.",
    season: [9, 10, 11],
    evidence: "some",
    properties: "Hips are exceptionally rich in vitamin C. Trials of rosehip powder show modest reductions in osteoarthritis pain. Rosehip seed oil is used to nourish skin and scars.",
    preparation: "Tea, syrup or jam; remove the irritating seed hairs.",
    cautions: "Seed hairs irritate the gut and skin (\"itching powder\").",
    lookalikes: "Other wild roses have similar hips and uses.",
    ranges: {
      high: ["europeTemperate"],
      medium: ["mediterranean", "westAsia", "southAmericaSouth", "eastEurope"],
      low: ["northAfrica", "naEast", "australiaSE", "newZealand", "scandinavia"]
    }
  },
  {
    id: "manuka",
    name: "Mānuka",
    latin: "Leptospermum scoparium",
    family: "Myrtaceae",
    uses: ["Skin & wounds", "Immune & colds"],
    parts: "Leaves, bark (and honey from its flowers)",
    habitat: "Scrubland, regenerating bush and coastal heath.",
    season: [11, 12, 1],
    evidence: "some",
    properties: "Māori rongoā used leaf infusions for fevers and colds and bark preparations for wounds. Medical-grade mānuka honey is used in wound dressings for its antibacterial activity.",
    preparation: "Leaf infusion; honey applied to wounds as medical-grade dressings.",
    cautions: "Use only medical-grade honey on wounds. Do not give honey to infants under 1 year.",
    lookalikes: "Kānuka is similar but with softer leaves.",
    ranges: {
      high: ["newZealand"],
      medium: ["australiaSE"],
      low: []
    }
  },
  {
    id: "buchu",
    name: "Buchu",
    latin: "Agathosma betulina",
    family: "Rutaceae",
    uses: ["Urinary", "Digestion"],
    parts: "Leaves",
    habitat: "Mountain fynbos on sandstone slopes.",
    season: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    evidence: "traditional",
    properties: "Used by the Khoi as a diuretic and for urinary tract and stomach complaints. Exported to Europe as a medicine since the 1800s.",
    preparation: "Infusion of leaves; buchu vinegar or brandy traditionally.",
    cautions: "Avoid in pregnancy and with kidney disease. Wild harvesting is regulated.",
    lookalikes: "Many related Agathosma species in fynbos.",
    ranges: {
      high: [],
      medium: ["cape"],
      low: []
    }
  }
];
