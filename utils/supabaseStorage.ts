import { supabase } from '@/supabaseClient'

export const getAudioUrl = async (fileName: string) => {
  try {
    const { data } = await supabase
      .storage
      .from('audio')
      .getPublicUrl(fileName)

    if (data) {
    }

    return data.publicUrl
  } catch (error) {
    if (error) {
      return [];
    }
    return (data || []).filter((f: any) => f.name.endsWith('.mp3')).map((f: any) => f.name);
  } catch (error) {
    return [];
  }
} 