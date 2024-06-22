import React, {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';
import ToggleButton from '../../shared/components/ToggleButton';
import {RootState} from '../../../types/rootState';
import {getSettings} from "../utils/settingsUtils";
import {setShowFiltersSorts} from "../../../store/store";

const ShowFiltersSortsToggle: React.FC = () => {
    const {t} = useTranslation();
    const dispatch = useDispatch();
    const showFiltersSorts = useSelector((state: RootState) => state.settings.showFiltersSorts);

    useEffect(() => {
        const settings = getSettings();
        dispatch(setShowFiltersSorts(settings.showFiltersSorts ?? true));
    }, [dispatch]);

    const handleToggleFiltersSorts = () => {
        dispatch(setShowFiltersSorts(!showFiltersSorts));
    };

    return (
        <>
            <label
                className="text-sm font-medium text-gray-800 dark:text-gray-200 mr-2 select-none">{t('Show Filters & Sorts')}</label>
            <ToggleButton
                isChecked={showFiltersSorts}
                onToggle={handleToggleFiltersSorts}
            />
        </>
    );
};

export default ShowFiltersSortsToggle;
