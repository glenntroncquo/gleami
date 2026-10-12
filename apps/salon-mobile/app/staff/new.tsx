import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, ErrorBanner, FieldRow, FormScreen, TextField, useModalHeader } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { createStaff } from '@/lib/api/staff';

export default function NewStaffScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const modalHeader = useModalHeader();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [specialization, setSpecialization] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const canSave = firstName.trim().length > 0 && email.trim().length > 0 && !saving && !!companyId && !!locationId;

  const handleSave = async () => {
    if (!companyId || !locationId || !canSave) {
      setErrorMessage(!locationId ? t('calendar.noLocation') : t('staff.validationRequired'));
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const staff = await createStaff(
        companyId,
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          specialization: specialization.trim(),
          status: '',
        },
        locationId
      );
      router.replace({ pathname: '/staff/[id]', params: { id: staff.id } });
    } catch {
      setErrorMessage(t('staff.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={modalHeader} />
      <FormScreen
        closable
        title={t('staff.addNew')}
        footer={<Button label={t('client.save')} onPress={handleSave} loading={saving} disabled={!canSave} />}>
        <ErrorBanner message={errorMessage} />
        <FieldRow>
          <TextField label={t('client.firstName')} value={firstName} onChangeText={setFirstName} autoCapitalize="words" textContentType="givenName" />
          <TextField label={t('client.lastName')} value={lastName} onChangeText={setLastName} autoCapitalize="words" textContentType="familyName" />
        </FieldRow>
        <TextField
          label={t('client.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label={t('client.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
        <TextField label={t('staff.specialization')} value={specialization} onChangeText={setSpecialization} />
      </FormScreen>
    </>
  );
}
