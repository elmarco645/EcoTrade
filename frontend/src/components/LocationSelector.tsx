import React, { useState, useEffect } from "react";
import { kenyaLocations } from "../data/kenyaLocations";
import { MapPin, ChevronDown } from "lucide-react";

interface LocationSelectorProps {
  onChange: (location: { county: string; subcounty: string; ward: string }) => void;
  initialLocation?: { county: string; subcounty: string; ward: string };
  disabled?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onChange, initialLocation, disabled }) => {
  const [county, setCounty] = useState(initialLocation?.county || "");
  const [subcounty, setSubcounty] = useState(initialLocation?.subcounty || "");
  const [ward, setWard] = useState(initialLocation?.ward || "");

  useEffect(() => {
    if (initialLocation) {
      setCounty(initialLocation.county);
      setSubcounty(initialLocation.subcounty);
      setWard(initialLocation.ward);
    }
  }, [initialLocation]);

  const handleCounty = (value: string) => {
    setCounty(value);
    setSubcounty("");
    setWard("");
    onChange({ county: value, subcounty: "", ward: "" });
  };

  const handleSubcounty = (value: string) => {
    setSubcounty(value);
    setWard("");
    onChange({ county, subcounty: value, ward: "" });
  };

  const handleWard = (value: string) => {
    setWard(value);
    onChange({ county, subcounty, ward: value });
  };

  const selectClasses = "h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-10 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-4">
      {/* County */}
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <select 
          value={county} 
          onChange={(e) => handleCounty(e.target.value)} 
          required 
          disabled={disabled}
          className={selectClasses}
        >
          <option value="">Select County</option>
          {Object.keys(kenyaLocations).sort().map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Subcounty */}
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <select
          value={subcounty}
          onChange={(e) => handleSubcounty(e.target.value)}
          disabled={!county || disabled}
          required
          className={selectClasses}
        >
          <option value="">Select Subcounty</option>
          {county && kenyaLocations[county] &&
            Object.keys(kenyaLocations[county]).sort().map((sc) => (
              <option key={sc} value={sc}>{sc}</option>
            ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Ward */}
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <select
          value={ward}
          onChange={(e) => handleWard(e.target.value)}
          disabled={!subcounty || disabled}
          required
          className={selectClasses}
        >
          <option value="">Select Ward</option>
          {county && subcounty && kenyaLocations[county] && kenyaLocations[county][subcounty] &&
            kenyaLocations[county][subcounty].sort().map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
};

export default LocationSelector;
