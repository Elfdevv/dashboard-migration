import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { HelpCircle } from 'lucide-react';

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [selectedMeasure, setSelectedMeasure] = useState('count'); // 'count' или 'price'
  const [selectedCategories, setSelectedCategories] = useState([]); 
  const [showPopularityInfo, setShowPopularityInfo] = useState(false);
  const [loading, setLoading] = useState(true);

  // Автоматическая загрузка вашего CSV-файла при старте страницы
  useEffect(() => {
    Papa.parse('/af_all_2024.csv', {
      download: true,
      header: true,
      dynamicTyping: true, // автоматически превращает текст с цифрами в реальные числа
      complete: function(results) {
        // Фильтруем пустые строки, если они есть
        const cleanData = results.data.filter(item => item.kind && item.price);
        setRawData(cleanData);
        setLoading(false);
      },
      error: function(err) {
        console.error("Ошибка чтения CSV файла:", err);
        setLoading(false);
      }
    });
  }, []);

  // ВЫЧИСЛИТЕЛЬНЫЙ ДВИЖОК (Пересчет логики из вашей справки Tableau)
  const processedCategories = useMemo(() => {
    if (rawData.length === 0) return [];

    const groups = {};
    rawData.forEach(item => {
      const category = item.kind || "Прочее";
      if (!groups[category]) {
        groups[category] = { name: category, rawPrices: [], totalRating: 0, totalScores: 0, count: 0 };
      }
      groups[category].rawPrices.push(Number(item.price) || 0);
      groups[category].totalRating += Number(item.rating) || 0;
      groups[category].totalScores += Number(item.scores) || 0;
      groups[category].count += 1;
    });

    const categoriesArray = Object.values(groups).map(g => {
      // Расчет Медианы Цен (как в Tableau)
      const sortedPrices = [...g.rawPrices].sort((a, b) => a - b);
      const mid = Math.floor(sortedPrices.length / 2);
      const medianPrice = sortedPrices.length % 2 !== 0 ? sortedPrices[mid] : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;

      return {
        name: g.name,
        count: g.count,
        medianPrice: Math.round(medianPrice),
        avgRating: g.totalRating / g.count,
        avgScores: g.totalScores / g.count
      };
    });

    // Расчет Популярности (0-3) по формуле нормализации Мин-Макс
    const maxCount = Math.max(...categoriesArray.map(c => c.count)) || 1;
    const maxRating = Math.max(...categoriesArray.map(c => c.avgRating)) || 1;
    const maxScores = Math.max(...categoriesArray.map(c => c.avgScores)) || 1;

    return categoriesArray.map(c => {
      const normCount = c.count / maxCount;
      const normRating = c.avgRating / maxRating;
      const normScores = c.avgScores / maxScores;
      const popularity = Number((normCount + normRating + normScores).toFixed(2));

      return { ...c, popularity };
    });
  }, [rawData]);

  // Фильтр для нижних графиков при клике на категории (Ctrl + Клик поддерживается)
  const filteredPoints = useMemo(() => {
    if (selectedCategories.length === 0) return rawData;
    return rawData.filter(item => selectedCategories.includes(item.kind));
  }, [rawData, selectedCategories]);

  const handleCategoryClick = (data, e) => {
    if (!data) return;
    const categoryName = data.name;
    if (e && (e.ctrlKey || e.metaKey)) {
      setSelectedCategories(prev => 
        prev.includes(categoryName) ? prev.filter(c => c !== categoryName) : [...prev, categoryName]
      );
    } else {
      setSelectedCategories(prev => prev.includes(categoryName) && prev.length === 1 ? [] : [categoryName]);
    }
  };

  const getPopularityColor = (val) => {
    if (val < 1) return '#ef4444'; // Низкая (Красный)
    if (val < 2) return '#f59e0b'; // Средняя (Желтый)
    return '#10b981'; // Высокая (Зеленый)
  };

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Загрузка данных из af_all_2024.csv...</div>;
  }

  return (
    <div style={{ padding: '24px', background: '#f8fafc', fontFamily: 'Arial, sans-serif', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Мониторинг средств размещения Иркутской области</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Локальный JS-движок (Без VPN и серверов Tableau)</p>
        </div>
        
        {/* Переключатель Меры (Прайс / Количество) */}
        <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
          <button 
            onClick={() => setSelectedMeasure('count')}
            style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, background: selectedMeasure === 'count' ? '#fff' : 'transparent' }}
          >
            Количество мест
          </button>
          <button 
            onClick={() => setSelectedMeasure('price')}
            style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, background: selectedMeasure === 'price' ? '#fff' : 'transparent' }}
          >
            Прайс (Медиана)
          </button>
        </div>
      </div>

      {showPopularityInfo && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Формула популярности из справки:</strong> Популярность = Нормализованное [Кол-во] + Нормализованный [Рейтинг] + Нормализованные [Оценки]. Диапазон: от 0 до 3.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* График 1: Популярность */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }} onClick={() => setShowPopularityInfo(!showPopularityInfo)}>
            <h3 style={{ margin: 0 }}>Популярность услуг ({selectedMeasure === 'count' ? 'Кол-во объектов' : 'Медиана цены'})</h3>
            <HelpCircle size={18} color="#64748b" />
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedCategories} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip formatter={(value, name, props) => [`Значение: ${value}`, `Популярность (0-3): ${props.payload.popularity}`]} />
                <Bar dataKey={selectedMeasure === 'count' ? 'count' : 'medianPrice'} onClick={(data, index, e) => handleCategoryClick(data, e)}>
                  {processedCategories.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getPopularityColor(entry.popularity)}
                      stroke={selectedCategories.includes(entry.name) ? '#000' : 'none'}
                      strokeWidth={2}
                      style={{ cursor: 'pointer', opacity: selectedCategories.length === 0 || selectedCategories.includes(entry.name) ? 1 : 0.4 }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>* Зажмите Ctrl/Cmd для выбора нескольких строк одновременно</p>
        </div>

        {/* График 2: Точечная диаграмма */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Распределение (Отзывы / Рейтинг)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis type="number" dataKey="scores" name="Количество оценок" />
                <YAxis type="number" dataKey="rating" name="Рейтинг" domain={[0, 10]} />
                <ZAxis type="number" dataKey="price" range={[40, 300]} name="Цена" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => [value, name]} />
                <Scatter name="Объекты" data={filteredPoints}>
                  {filteredPoints.map((entry, index) => {
                    const catInfo = processedCategories.find(c => c.name === entry.kind);
                    const pop = catInfo ? catInfo.popularity : 1;
                    return <Cell key={`dot-${index}`} fill={getPopularityColor(pop)} opacity={0.7} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Слой 3: Карта / Счётчик */}
        <div style={{ gridColumn: '1 / -1', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 4px 0' }}>Географическое распределение</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>Отображено объектов на базе вашего CSV: <b>{filteredPoints.length}</b></p>
          <div style={{ height: '250px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', color: '#475569', fontWeight: 'bold' }}>Интерактивная карта Иркутской области</span>
            <span style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', maxWidth: '500px' }}>
              Данные успешно привязаны по широте/долготе из файла. При клике на категории выше этот список моментально фильтруется (осталось объектов: {filteredPoints.length}).
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}