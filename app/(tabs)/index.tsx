import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView, 
  Platform,
  Keyboard,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- 1. TYPING ---
interface ForecastData {
  location: string;
  details: string; 
  temperature: number;
  conditionCode: number;
  windSpeed: number;
}

// --- 2. CUSTOM HOOK ---
function useWeatherService() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = useCallback(async (query: string) => {
    const cleanQuery = query.trim(); 
    if (!cleanQuery) return;

    setIsSearching(true);
    setErrorMessage('');
    setData(null);
    Keyboard.dismiss();

    try {
      const encodedQuery = encodeURIComponent(cleanQuery);
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedQuery}&count=1&language=pt&format=json`;
      const geoRes = await fetch(geoUrl);
      const geoJson = await geoRes.json();

      if (!geoJson.results?.length) {
        throw new Error('Localidade não encontrada.');
      }

      const { latitude, longitude, name, admin1, country } = geoJson.results[0];

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
      const weatherRes = await fetch(weatherUrl);
      const weatherJson = await weatherRes.json();
      const current = weatherJson.current_weather;

      setData({
        location: name,
        details: admin1 ? `${admin1}, ${country}` : country,
        temperature: current.temperature,
        conditionCode: current.weathercode,
        windSpeed: current.windspeed,
      });

    } catch (err) {
      setErrorMessage('Não conseguimos localizar essa cidade.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  return { data, isSearching, errorMessage, handleSearch };
}

// --- 3. HELPER VISUAL ---
const getWeatherAssets = (code: number) => {
  if (code === 0) return { name: 'sunny', color: '#FFB300', label: 'Céu Limpo' };
  if (code >= 1 && code <= 3) return { name: 'partly-sunny', color: '#90A4AE', label: 'Nublado' };
  if ([51, 61, 80].includes(code)) return { name: 'rainy', color: '#4FC3F7', label: 'Chuvoso' };
  if (code >= 95) return { name: 'thunderstorm', color: '#7986CB', label: 'Tempestade' };
  return { name: 'cloud-outline', color: '#B0BEC5', label: 'Disperso' };
};

// --- 4. COMPONENTE PRINCIPAL ---
export default function WeatherView() {
  const [searchInput, setSearchInput] = useState('');
  const { data, isSearching, errorMessage, handleSearch } = useWeatherService();

  const onTriggerSearch = () => handleSearch(searchInput);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollCenter} keyboardShouldPersistTaps="handled">
        
        {/* CONTAINER LIMITADOR DE LARGURA (NOVO) */}
        <View style={styles.contentWrapper}>

          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Clima</Text>
            <Text style={styles.headerSubtitle}>Aonde você quer consultar o tempo?</Text>
          </View>

          {/* BARRA DE BUSCA */}
          <View style={styles.searchBar}>
            <TextInput 
              style={styles.inputField}
              placeholder="Digite o nome da cidade aqui"
              placeholderTextColor="#90A4AE"
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={onTriggerSearch}
              returnKeyType="search"
            />
            <TouchableOpacity 
              style={styles.searchBtn} 
              onPress={onTriggerSearch}
              activeOpacity={0.7}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="search" size={22} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* MENSAGEM DE ERRO */}
          {errorMessage ? (
            <View style={styles.messageContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#E57373" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* CARD DE RESULTADO */}
          {data && !isSearching && (
            <View style={styles.resultCard}>
              
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={20} color="#29B6F6" />
                <View style={{marginLeft: 10}}>
                  <Text style={styles.cityText}>{data.location}</Text>
                  <Text style={styles.regionText}>{data.details}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.weatherBody}>
                {/* @ts-ignore */}
                <Ionicons 
                  name={getWeatherAssets(data.conditionCode).name as any} 
                  size={70} 
                  color={getWeatherAssets(data.conditionCode).color} 
                />
                <View style={styles.tempWrapper}>
                  <Text style={styles.tempText}>{Math.round(data.temperature)}°</Text>
                  <Text style={styles.conditionText}>
                    {getWeatherAssets(data.conditionCode).label}
                  </Text>
                </View>
              </View>

              <View style={styles.footerBox}>
                <Ionicons name="speedometer-outline" size={16} color="#78909C" />
                <Text style={styles.footerText}>Vento: {data.windSpeed} km/h</Text>
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    paddingTop: Platform.OS === 'android' ? 35 : 0,
  },
  scrollCenter: {
    flexGrow: 1,
    justifyContent: 'center', // Centraliza verticalmente na tela toda
    padding: 24,
  },
  // --- NOVO CONTAINER ---
  // Isso limita a largura em telas grandes (Web/Tablet) mas enche a tela no celular
  contentWrapper: {
    width: '100%',
    maxWidth: 480, // Largura máxima elegante
    alignSelf: 'center', // Centraliza horizontalmente o bloco
    alignItems: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0277BD',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#546E7A',
    marginTop: 8,
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Mais arredondado (Harmônico)
    padding: 6,
    shadowColor: '#81D4FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
    width: '100%', // Ocupa 100% do contentWrapper (que é limitado)
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    paddingVertical: 12, // Altura confortável
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#37474F',
  },
  searchBtn: {
    backgroundColor: '#29B6F6',
    width: 48,  // Quadrado perfeito dentro do círculo
    height: 48, // Igual a largura
    borderRadius: 20, // Arredondamento suave acompanhando o container
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2, // Pequeno respiro da borda
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#E57373',
    marginLeft: 8,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#0277BD',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0277BD',
  },
  regionText: {
    fontSize: 14,
    color: '#78909C',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E1F5FE',
    marginVertical: 16,
  },
  weatherBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tempWrapper: {
    alignItems: 'flex-end',
  },
  tempText: {
    fontSize: 56,
    fontWeight: '300',
    color: '#01579B',
    letterSpacing: -2,
  },
  conditionText: {
    fontSize: 16,
    color: '#29B6F6',
    fontWeight: '600',
    marginTop: -6,
  },
  footerBox: {
    marginTop: 20,
    backgroundColor: '#E1F5FE',
    padding: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  footerText: {
    marginLeft: 6,
    color: '#546E7A',
    fontWeight: '600',
    fontSize: 13,
  },
});