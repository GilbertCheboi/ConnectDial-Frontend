import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../store/authStore';
import api from '../../api/client';

// Local assets for teams
const teamsByLeague = {
  1: [
    { id: 1, name: 'Arsenal', logo: require('../assets/arsenal.jpeg') },
    { id: 2, name: 'Liverpool', logo: require('../assets/liverpool.png') },
    {
      id: 3,
      name: 'Manchester United',
      logo: require('../assets/manutd.png'),
    },
    { id: 4, name: 'Chelsea', logo: require('../assets/chelsea.png') },
    { id: 5, name: 'Manchester City', logo: require('../assets/mancity.png') },
    { id: 6, name: 'Tottenham', logo: require('../assets/tottenham.jpg') },
    { id: 7, name: 'Everton', logo: require('../assets/Everton.png') },
    { id: 8, name: 'West Ham', logo: require('../assets/westham.png') },
    { id: 9, name: 'Leicester City', logo: require('../assets/leicester.png') },
    {
      id: 10,
      name: 'Newcastle United',
      logo: require('../assets/newcastle.png'),
    },
    { id: 11, name: 'Aston Villa', logo: require('../assets/astonvilla.png') },
    { id: 12, name: 'Wolves', logo: require('../assets/wolves.png') },
    { id: 13, name: 'Brighton', logo: require('../assets/brighton.jpg') },
    {
      id: 14,
      name: 'Crystal Palace',
      logo: require('../assets/crystalpalace.png'),
    },
    { id: 15, name: 'Southampton', logo: require('../assets/southampton.png') },
    { id: 16, name: 'Burnley', logo: require('../assets/burnley.png') },
    { id: 17, name: 'Norwich City', logo: require('../assets/norwich.jpg') },
    { id: 18, name: 'Watford', logo: require('../assets/watford.png') },
    { id: 19, name: 'Brentford', logo: require('../assets/brentford.png') },
    { id: 20, name: 'Fulham', logo: require('../assets/fulham.png') },
  ],
  2: [
    { id: 21, name: 'Lakers', logo: require('../assets/lakers.png') },
    { id: 22, name: 'Warriors', logo: require('../assets/warriors.png') },
    { id: 23, name: 'Celtics', logo: require('../assets/celtics.png') },
    { id: 24, name: 'Bulls', logo: require('../assets/bulls.png') },
    { id: 25, name: 'Nets', logo: require('../assets/nets.png') },
    { id: 26, name: 'Heat', logo: require('../assets/heat.png') },
    { id: 27, name: 'Suns', logo: require('../assets/suns.jpg') },
    { id: 28, name: 'Mavericks', logo: require('../assets/mavericks.png') },
    { id: 29, name: '76ers', logo: require('../assets/76ers.png') },
    { id: 30, name: 'Raptors', logo: require('../assets/raptors.png') },
    { id: 31, name: 'Clippers', logo: require('../assets/clippers.png') },
    { id: 32, name: 'Jazz', logo: require('../assets/jazz.png') },
    { id: 33, name: 'Grizzlies', logo: require('../assets/grizzlies.png') },
    { id: 34, name: 'Pelicans', logo: require('../assets/pelicans.png') },
    { id: 35, name: 'Kings', logo: require('../assets/kings.png') },
    { id: 36, name: 'Magic', logo: require('../assets/magic.jpg') },
    { id: 37, name: 'Rockets', logo: require('../assets/rockets.png') },
    {
      id: 38,
      name: 'Timberwolves',
      logo: require('../assets/timberwolves.png'),
    },
    { id: 39, name: 'Pacers', logo: require('../assets/pacers.png') },
    { id: 40, name: 'Hornets', logo: require('../assets/hornets.png') },
  ],
  3: [
    { id: 41, name: 'Chiefs', logo: require('../assets/chiefs.png') },
    { id: 42, name: 'Cowboys', logo: require('../assets/cowboys.jpg') },
    { id: 43, name: '49ers', logo: require('../assets/49ers.png') },
    { id: 44, name: 'Packers', logo: require('../assets/packers.png') },
    { id: 45, name: 'Buccaneers', logo: require('../assets/buccaneers.png') },
    { id: 46, name: 'Rams', logo: require('../assets/rams.png') },
    { id: 47, name: 'Cardinals', logo: require('../assets/cardinals.png') },
    {
      id: 48,
      name: 'Bears',
      logo: require('../assets/Chicago-Bears-Logo.png'),
    },
    { id: 49, name: 'Steelers', logo: require('../assets/steelers.png') },
    {
      id: 50,
      name: 'Browns',
      logo: require('../assets/Cleveland-Browns-Logo.png'),
    },
    {
      id: 51,
      name: 'Dolphins',
      logo: require('../assets/Miami_Dolphins_logo.svg.png'),
    },
    {
      id: 52,
      name: 'Vikings',
      logo: require('../assets/Minnesota-Vikings-Logo.png'),
    },
    {
      id: 53,
      name: 'Jets',
      logo: require('../assets/New_York_Jets_logo.svg.png'),
    },
    {
      id: 54,
      name: 'Bills',
      logo: require('../assets/buffalo-bills-logo.png'),
    },
    { id: 55, name: 'Falcons', logo: require('../assets/falcons.png') },
    {
      id: 56,
      name: 'Ravens',
      logo: require('../assets/baltimore-ravens-logo-transparent.png'),
    },
    { id: 57, name: 'Lions', logo: require('../assets/detroit-lions.png') },
    {
      id: 58,
      name: 'Commanders',
      logo: require('../assets/washington-commanders-logo.png'),
    },
    {
      id: 59,
      name: 'Saints',
      logo: require('../assets/New-Orleans-Saints-Logo.png'),
    },
    {
      id: 60,
      name: 'Giants',
      logo: require('../assets/new-york-giants-football-logo.png'),
    },
  ],
  4: [
    { id: 61, name: 'Mercedes', logo: require('../assets/mercedes.png') },
    { id: 62, name: 'Red Bull', logo: require('../assets/redbull.png') },
    { id: 63, name: 'Ferrari', logo: require('../assets/ferrari.png') },
    {
      id: 64,
      name: 'McLaren',
      logo: require('../assets/McLaren_Racing_logo.png'),
    },
    { id: 65, name: 'Alpine', logo: require('../assets/Alpine-Logo.png') },
    {
      id: 66,
      name: 'Aston Martin',
      logo: require('../assets/astonmartin.jpg'),
    },
    { id: 67, name: 'AlphaTauri', logo: require('../assets/alphatauri.png') },
    { id: 68, name: 'Haas', logo: require('../assets/haas.png') },
    {
      id: 69,
      name: 'Williams',
      logo: require('../assets/williams-f1-logo.png'),
    },
  ],
  5: [
    { id: 70, name: 'Real Madrid', logo: require('../assets/realmadrid.png') },
    { id: 71, name: 'Barcelona', logo: require('../assets/barcelona.png') },
    { id: 72, name: 'Bayern Munich', logo: require('../assets/bayern.png') },
    { id: 73, name: 'Paris Saint-Germain', logo: require('../assets/psg.png') },
    { id: 74, name: 'Juventus', logo: require('../assets/juventus.png') },
    { id: 75, name: 'Liverpool', logo: require('../assets/liverpool.png') },
    { id: 76, name: 'Manchester City', logo: require('../assets/mancity.png') },
    { id: 77, name: 'Chelsea', logo: require('../assets/chelsea.png') },
    { id: 78, name: 'Inter Milan', logo: require('../assets/intermilan.png') },
    { id: 79, name: 'AC Milan', logo: require('../assets/acmilan.png') },
    {
      id: 80,
      name: 'Atletico Madrid',
      logo: require('../assets/atletico.png'),
    },
    { id: 81, name: 'Ajax', logo: require('../assets/ajax.png') },
    { id: 82, name: 'Porto', logo: require('../assets/porto.png') },
    { id: 803, name: 'Benfica', logo: require('../assets/benfica.jpg') },
    { id: 84, name: 'Dortmund', logo: require('../assets/dortmund.png') },
    { id: 85, name: 'Roma', logo: require('../assets/roma.png') },
    { id: 86, name: 'Lyon', logo: require('../assets/lyon.jpg') },
    { id: 87, name: 'Marseille', logo: require('../assets/marseille.png') },
    {
      id: 88,
      name: 'Shakhtar Donetsk',
      logo: require('../assets/shakhtar.png'),
    },
    { id: 89, name: 'Galatasaray', logo: require('../assets/galatasaray.png') },
    { id: 91, name: 'Celtic', logo: require('../assets/celtic.png') },
    {
      id: 94,
      name: 'Manchester United',
      logo: require('../assets/manutd.png'),
    },
  ],

  6: [
    { id: 95, name: 'Yankees', logo: require('../assets/yankees.png') },
    { id: 96, name: 'Dodgers', logo: require('../assets/dodgers.png') },
    { id: 97, name: 'Red Sox', logo: require('../assets/redsox.png') },
    { id: 98, name: 'Cubs', logo: require('../assets/cubs.png') },
    { id: 99, name: 'Cardinals', logo: require('../assets/cardinals.png') },
    { id: 100, name: 'Giants', logo: require('../assets/giants.png') },
    { id: 101, name: 'Mets', logo: require('../assets/mets.png') },
    {
      id: 102,
      name: 'Nationals',
      logo: require('../assets/Washington-Nationals-Logo.png'),
    },
    { id: 103, name: 'Orioles', logo: require('../assets/orioles.png') },
    { id: 104, name: 'Rays', logo: require('../assets/rays.png') },
    { id: 105, name: 'Mariners', logo: require('../assets/mariners.png') },
    {
      id: 106,
      name: 'Rangers',
      logo: require('../assets/Texas-Rangers-Symbol.png'),
    },
    {
      id: 107,
      name: 'Athletics',
      logo: require('../assets/Oakland-Athletics-Logo.png'),
    },
    {
      id: 108,
      name: 'Blue Jays',
      logo: require('../assets/Toronto-Blue-Jays-Logo.png'),
    },
    { id: 109, name: 'Pirates', logo: require('../assets/pirates.png') },
    { id: 110, name: 'Brewers', logo: require('../assets/brewers.jpg') },
    { id: 111, name: 'Reds', logo: require('../assets/reds.png') },
    { id: 112, name: 'Twins', logo: require('../assets/twins.png') },
    { id: 113, name: 'Braves', logo: require('../assets/braves.png') },
    {
      id: 114,
      name: 'Diamondbacks',
      logo: require('../assets/diamondbacks.png'),
    },
  ],
  7: [
    { id: 101, name: 'Maple Leafs', logo: require('../assets/mapleleafs.png') },
    { id: 102, name: 'Canadiens', logo: require('../assets/canadiens.png') },
    { id: 103, name: 'Blackhawks', logo: require('../assets/blackhawks.png') },
    { id: 104, name: 'Red Wings', logo: require('../assets/redwings.jpg') },
    { id: 105, name: 'Bruins', logo: require('../assets/bruins.png') },
    { id: 106, name: 'Rangers', logo: require('../assets/rangers_NHL.png') },
    {
      id: 107,
      name: 'Penguins',
      logo: require('../assets/Pittsburgh-Penguins-Logo-1972-1992.png'),
    },
    {
      id: 108,
      name: 'Flyers',
      logo: require('../assets/Philadelphia-Flyers-logo.png'),
    },
    { id: 109, name: 'Capitals', logo: require('../assets/capitals.jpg') },
    {
      id: 110,
      name: 'Avalanche',
      logo: require('../assets/Colorado-Avalanche-logo.png'),
    },
    {
      id: 111,
      name: 'Lightning',
      logo: require('../assets/Tampa-Bay-Lightning-Logo.png'),
    },
    {
      id: 112,
      name: 'Stars',
      logo: require('../assets/Dallas-Stars-Logo.png'),
    },
    {
      id: 113,
      name: 'Canucks',
      logo: require('../assets/Vancouver-Canucks-Logo.png'),
    },
    {
      id: 114,
      name: 'Senators',
      logo: require('../assets/Ottawa-Senators-Logo-1992-1997.png'),
    },
    { id: 115, name: 'Hurricanes', logo: require('../assets/hurricanes.png') },
    {
      id: 116,
      name: 'Panthers',
      logo: require('../assets/Florida-Panthers-logo.png'),
    },
    {
      id: 117,
      name: 'Predators',
      logo: require('../assets/Nashville-Predators-Logo-2011-present.jpg'),
    },
    {
      id: 118,
      name: 'Jets',
      logo: require('../assets/Winnipeg-Jets-logo.png'),
    },
    {
      id: 119,
      name: 'Golden Knights',
      logo: require('../assets/Vegas-Golden-Knights-Logo.png'),
    },
    {
      id: 120,
      name: 'Blue Jackets',
      logo: require('../assets/Columbus-Blue-Jackets-Logo-2000-2003.png'),
    },
  ],
  8: [
    { id: 121, name: 'Real Madrid', logo: require('../assets/realmadrid.png') },
    { id: 122, name: 'Barcelona', logo: require('../assets/barcelona.png') },
    {
      id: 123,
      name: 'Atletico Madrid',
      logo: require('../assets/atletico.png'),
    },
    { id: 124, name: 'Sevilla', logo: require('../assets/sevilla.png') },
    { id: 125, name: 'Valencia', logo: require('../assets/valencia.png') },
    { id: 126, name: 'Villarreal', logo: require('../assets/villarreal.png') },
    {
      id: 127,
      name: 'Real Sociedad',
      logo: require('../assets/realsociedad.png'),
    },
    {
      id: 128,
      name: 'Athletic Bilbao',
      logo: require('../assets/Athletic-Bilbao-Logo.png'),
    },
    { id: 129, name: 'Celta Vigo', logo: require('../assets/celtavigo.png') },
    { id: 130, name: 'Granada', logo: require('../assets/granada.png') },
    { id: 131, name: 'Osasuna', logo: require('../assets/osasuna.png') },
    { id: 132, name: 'Alaves', logo: require('../assets/alaves.png') },
    { id: 133, name: 'Levante', logo: require('../assets/levante.png') },
    { id: 134, name: 'Cadiz', logo: require('../assets/cadiz.png') },
    { id: 135, name: 'Elche', logo: require('../assets/elche.png') },
    { id: 136, name: 'Huesca', logo: require('../assets/huesca.png') },
    { id: 137, name: 'Real Betis', logo: require('../assets/realbetis.png') },
    {
      id: 138,
      name: 'Rayo Vallecano',
      logo: require('../assets/rayovallecano.png'),
    },
    { id: 139, name: 'Mallorca', logo: require('../assets/mallorca.png') },
    { id: 140, name: 'Girona', logo: require('../assets/girona.png') },
  ],
  9: [
    { id: 141, name: 'Juventus', logo: require('../assets/juventus.png') },
    { id: 142, name: 'Inter Milan', logo: require('../assets/intermilan.png') },
    { id: 143, name: 'AC Milan', logo: require('../assets/acmilan.png') },
    { id: 144, name: 'Napoli', logo: require('../assets/napoli.png') },
    { id: 145, name: 'Roma', logo: require('../assets/roma.png') },
    { id: 146, name: 'Lazio', logo: require('../assets/lazio.png') },
    { id: 147, name: 'Atalanta', logo: require('../assets/atalanta.png') },
    { id: 148, name: 'Fiorentina', logo: require('../assets/fiorentina.png') },
    { id: 149, name: 'Sassuolo', logo: require('../assets/sassuolo.png') },
    { id: 150, name: 'Udinese', logo: require('../assets/udinese.jpg') },
    { id: 151, name: 'Bologna', logo: require('../assets/bologna.png') },
    { id: 152, name: 'Genoa', logo: require('../assets/genoa.png') },
    { id: 153, name: 'Sampdoria', logo: require('../assets/sampdoria.png') },
    { id: 154, name: 'Empoli', logo: require('../assets/empoli.png') },
    { id: 155, name: 'Monza', logo: require('../assets/monza.png') },
    { id: 156, name: 'Lecce', logo: require('../assets/lecce.png') },
    { id: 157, name: 'Verona', logo: require('../assets/verona.png') },
    {
      id: 158,
      name: 'Salernitana',
      logo: require('../assets/salernitana.png'),
    },
    { id: 159, name: 'Cremonese', logo: require('../assets/cremonese.png') },
    { id: 160, name: 'Frosinone', logo: require('../assets/frosinone.png') },
  ],
  10: [
    { id: 161, name: 'Bayern Munich', logo: require('../assets/bayern.png') },
    {
      id: 162,
      name: 'Borussia Dortmund',
      logo: require('../assets/dortmund.png'),
    },
    { id: 163, name: 'RB Leipzig', logo: require('../assets/rbleipzig.png') },
    {
      id: 164,
      name: 'Bayer Leverkusen',
      logo: require('../assets/leverkusen.png'),
    },
    { id: 165, name: 'Schalke 04', logo: require('../assets/schalke.png') },
    {
      id: 166,
      name: 'Eintracht Frankfurt',
      logo: require('../assets/frankfurt.png'),
    },
    {
      id: 167,
      name: 'VfL Wolfsburg',
      logo: require('../assets/wolfsburg.png'),
    },
    {
      id: 168,
      name: 'Borussia Mönchengladbach',
      logo: require('../assets/gladbach.png'),
    },
    { id: 169, name: 'FC Köln', logo: require('../assets/koln.png') },
    { id: 170, name: 'Hoffenheim', logo: require('../assets/hoffenheim.png') },
    { id: 171, name: 'Freiburg', logo: require('../assets/freiburg.png') },
    { id: 172, name: 'Werder Bremen', logo: require('../assets/bremen.png') },
    {
      id: 173,
      name: 'VfB Stuttgart',
      logo: require('../assets/stuttgart.png'),
    },
  ],
  11: [
    {
      id: 174,
      name: 'Paris Saint-Germain',
      logo: require('../assets/psg.png'),
    },
    { id: 175, name: 'Marseille', logo: require('../assets/marseille.png') },
    { id: 176, name: 'Lyon', logo: require('../assets/lyon.jpg') },
    { id: 177, name: 'Monaco', logo: require('../assets/monaco.png') },
    { id: 178, name: 'Lille', logo: require('../assets/lille.png') },
    { id: 179, name: 'Rennes', logo: require('../assets/rennes.png') },
    { id: 180, name: 'Nice', logo: require('../assets/nice.png') },
    { id: 181, name: 'Strasbourg', logo: require('../assets/strasbourg.png') },
    { id: 182, name: 'Metz', logo: require('../assets/metz.png') },
    { id: 183, name: 'Bordeaux', logo: require('../assets/bordeaux.png') },
    { id: 184, name: 'Nantes', logo: require('../assets/nantes.png') },
    { id: 185, name: 'Reims', logo: require('../assets/reims.png') },
    { id: 186, name: 'Angers', logo: require('../assets/angers.png') },
    { id: 187, name: 'Dijon', logo: require('../assets/dijon.png') },
    {
      id: 188,
      name: 'Saint-Étienne',
      logo: require('../assets/saintetienne.png'),
    },
    { id: 189, name: 'Clermont', logo: require('../assets/clermont.png') },
    { id: 190, name: 'Toulouse', logo: require('../assets/toulouse.png') },
    { id: 191, name: 'Brest', logo: require('../assets/brest.png') },
    { id: 192, name: 'Lorient', logo: require('../assets/lorient.png') },
  ],
  12: [
    { id: 193, name: 'Algeria', logo: require('../assets/algeria.png') },
    { id: 194, name: 'Egypt', logo: require('../assets/egypt.png') },
    { id: 195, name: 'Nigeria', logo: require('../assets/nigeria.png') },
    { id: 196, name: 'Ghana', logo: require('../assets/ghana.png') },
    { id: 197, name: 'Cameroon', logo: require('../assets/cameroon.png') },
    { id: 198, name: 'Senegal', logo: require('../assets/senegal.png') },
    { id: 199, name: 'Ivory Coast', logo: require('../assets/ivorycoast.png') },
    { id: 200, name: 'Morocco', logo: require('../assets/morocco.png') },
    { id: 201, name: 'Tunisia', logo: require('../assets/tunisia.png') },
    {
      id: 202,
      name: 'South Africa',
      logo: require('../assets/southafrica.png'),
    },
    { id: 203, name: 'Gabon', logo: require('../assets/gabon.png') },
    { id: 204, name: 'Angola', logo: require('../assets/angola.png') },
    { id: 205, name: 'DR Congo', logo: require('../assets/drcongo.png') },
    { id: 206, name: 'Zambia', logo: require('../assets/zambia.png') },
    { id: 207, name: 'Ethiopia', logo: require('../assets/ethiopia.png') },
    { id: 208, name: 'Kenya', logo: require('../assets/kenya.png') },
    { id: 209, name: 'Uganda', logo: require('../assets/uganda.png') },
    { id: 210, name: 'Zimbabwe', logo: require('../assets/zimbabwe.png') },
    { id: 211, name: 'Mali', logo: require('../assets/mali.png') },
    { id: 212, name: 'Rwanda', logo: require('../assets/rwanda.png') },
  ],
};

export default function ChooseTeamsScreen({ route }) {
  // --- 1. HOOKS ALWAYS AT THE TOP (Unconditional) ---
  const navigation = useNavigation();
  const { setIsNew } = useContext(AuthContext);

  // --- 2. STATE & PARAMS ---
  const { selectedLeagues } = route.params || { selectedLeagues: [] };
  const [selectedTeams, setSelectedTeams] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 3. HANDLERS ---
  const selectTeam = (leagueId, teamId) => {
    setSelectedTeams(prev => ({ ...prev, [leagueId]: teamId }));
  };

  const handleOnboardingSubmit = async () => {
    // Validation
    if (Object.keys(selectedTeams).length !== selectedLeagues.length) {
      Alert.alert(
        'Selection Incomplete',
        'Please pick one team for every league you selected.',
      );
      return;
    }

    setIsSubmitting(true);

    const payload = {
      fan_preferences: Object.entries(selectedTeams).map(
        ([leagueId, teamId]) => ({
          league: parseInt(leagueId),
          team: teamId,
        }),
      ),
    };

    try {
      console.log('Step 1: Sending preferences to Django...');
      const response = await api.post('auth/onboarding/', payload);
      console.log('Step 2: Backend Success!', response.status);

      // Navigate to CreateProfile
      console.log('Step 3: Navigating to CreateProfile...');
      navigation.navigate('CreateProfile');
    } catch (error) {
      console.error('Onboarding Submit Error:', error);
      let msg = "We couldn't save your preferences.";
      if (error.response?.data) {
        msg =
          typeof error.response.data === 'object'
            ? JSON.stringify(error.response.data)
            : error.response.data;
      } else {
        msg = error.message;
      }
      Alert.alert('System Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Pick One Team Per League</Text>

        {selectedLeagues.map(leagueId => (
          <View key={leagueId} style={styles.leagueSection}>
            <Text style={styles.leagueTitle}>League {leagueId}</Text>
            <FlatList
              data={teamsByLeague[leagueId] || []}
              keyExtractor={item => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedTeams[leagueId] === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => selectTeam(leagueId, item.id)}
                    style={[
                      styles.teamCard,
                      isSelected && styles.teamCardSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Image source={item.logo} style={styles.teamLogo} />
                    <Text
                      style={[
                        styles.teamName,
                        isSelected && styles.teamNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleOnboardingSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Continue to Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0D1F2D' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  leagueSection: { marginBottom: 30 },
  leagueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E90FF',
    marginBottom: 12,
  },
  teamCard: {
    width: 110,
    height: 130,
    backgroundColor: '#1A2A3D',
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#2A3A4D',
  },
  teamCardSelected: {
    backgroundColor: '#1E90FF',
    borderColor: '#fff',
    elevation: 5,
  },
  teamLogo: { width: 60, height: 60, resizeMode: 'contain', marginBottom: 8 },
  teamName: { fontSize: 14, color: '#BDC3C7', textAlign: 'center' },
  teamNameSelected: { fontWeight: 'bold', color: '#fff' },
  footer: {
    padding: 20,
    backgroundColor: '#0D1F2D',
    borderTopWidth: 1,
    borderTopColor: '#1A2A3D',
  },
  submitButton: {
    backgroundColor: '#1E90FF',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#555' },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
